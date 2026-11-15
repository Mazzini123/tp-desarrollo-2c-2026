import {
  ACCION_ADMINISTRATIVA,
  TIPO_ENTIDAD_AUDITADA,
} from "../domain/enums/ACCION_ADMINISTRATIVA.js";
import { ConflictError } from "../errors/ConflictError.js";
import { DomainError } from "../errors/DomainError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import {
  esDestacadoVigente,
  motivoDeInelegibilidad,
  superaElTope,
} from "./reglasDeDestacado.js";

export class DestacadoService {
  constructor({
    transacciones,
    proyectoRepository,
    colectivoRepository,
    auditoriaService,
    conflictoDeIntereses,
    maxDestacadosActivos,
  }) {
    this.transacciones = transacciones;
    this.proyectoRepository = proyectoRepository;
    this.colectivoRepository = colectivoRepository;
    this.auditoriaService = auditoriaService;
    this.conflictoDeIntereses = conflictoDeIntereses;
    this.maxDestacadosActivos = maxDestacadosActivos;
  }

  async destacar({ proyectoId, hasta, actor, ahora = new Date() }) {
    return this.transacciones.ejecutar(async () => {
      await this.proyectoRepository.bloquearDestacados();
      const proyecto = await this.#proyectoAdministrable(proyectoId, actor);

      const colectivo = await this.colectivoRepository.buscarResumen(
        String(proyecto.colectivoId),
      );
      const motivo = motivoDeInelegibilidad(proyecto, colectivo);
      if (motivo) throw new DomainError(motivo);
      if (!(hasta > ahora)) {
        throw new DomainError(
          "La fecha de vencimiento del destacado tiene que ser futura",
        );
      }

      const yaVigente = esDestacadoVigente(proyecto, ahora);
      const vigentesDeOtros = await this.proyectoRepository.contarDestacadosVigentes(
        ahora,
        proyecto._id,
      );
      if (superaElTope(vigentesDeOtros, this.maxDestacadosActivos)) {
        throw new ConflictError(
          `Ya hay ${this.maxDestacadosActivos} proyectos destacados vigentes`,
        );
      }

      const destacado = {
        desde: yaVigente ? proyecto.destacado.desde : ahora,
        hasta,
        marcadoPor: actor.usuarioId,
      };
      await this.proyectoRepository.fijarDestacado(proyecto._id, destacado);
      await this.auditoriaService.registrar({
        actor,
        accion: ACCION_ADMINISTRATIVA.PROYECTO_DESTACADO,
        entidad: { tipo: TIPO_ENTIDAD_AUDITADA.PROYECTO, id: proyecto._id },
        detalle: { hasta: hasta.toISOString(), ...(yaVigente && { cambio: true }) },
      });
      return { id: String(proyecto._id), destacado: { desde: destacado.desde, hasta } };
    });
  }

  async quitar({ proyectoId, actor }) {
    return this.transacciones.ejecutar(async () => {
      await this.proyectoRepository.bloquearDestacados();
      const proyecto = await this.#proyectoAdministrable(proyectoId, actor);
      if (!proyecto.destacado) throw new NotFoundError("El proyecto no esta destacado");

      await this.proyectoRepository.quitarDestacado(proyecto._id);
      await this.auditoriaService.registrar({
        actor,
        accion: ACCION_ADMINISTRATIVA.PROYECTO_DESTACADO_QUITADO,
        entidad: { tipo: TIPO_ENTIDAD_AUDITADA.PROYECTO, id: proyecto._id },
      });
    });
  }

  async #proyectoAdministrable(proyectoId, actor) {
    const proyecto = await this.proyectoRepository.buscarParaDestacar(proyectoId);
    if (!proyecto) throw new NotFoundError("No existe ese proyecto");
    await this.conflictoDeIntereses.exigirSinConflicto(
      actor.usuarioId,
      proyecto.colectivoId,
    );
    return proyecto;
  }
}
