import {
  ACCION_ADMINISTRATIVA,
  TIPO_ENTIDAD_AUDITADA,
} from "../domain/enums/ACCION_ADMINISTRATIVA.js";
import { ConflictError } from "../errors/ConflictError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { darDeBajaProyecto } from "./reglasDePostulacion.js";
import { notificarResoluciones } from "./soporte/notificarResoluciones.js";
import {
  paginaDeResumenes,
  resumenParaAdministracion,
} from "../dto/resumenDeProyecto.js";
import { armarPaginado } from "../utils/paginacion.js";

export class BajaPorInfraccionService {
  constructor({
    transacciones,
    proyectoRepository,
    revisionRepository,
    colectivoService,
    membresiaService,
    notificacionService,
    auditoriaService,
    conflictoDeIntereses,
  }) {
    this.transacciones = transacciones;
    this.proyectoRepository = proyectoRepository;
    this.revisionRepository = revisionRepository;
    this.colectivoService = colectivoService;
    this.membresiaService = membresiaService;
    this.notificacionService = notificacionService;
    this.auditoriaService = auditoriaService;
    this.conflictoDeIntereses = conflictoDeIntereses;
  }

  async listarProyectos({
    numeroPagina = 1,
    limitePorPagina = 10,
    usuarioId,
    ...filtros
  }) {
    const pagina = { numeroPagina, limitePorPagina };
    const [encontrados, colectivosPropios] = await Promise.all([
      this.proyectoRepository.listarParaAdministracion(pagina, filtros),
      this.conflictoDeIntereses.colectivosDe(usuarioId),
    ]);
    return paginaDeResumenes(armarPaginado(encontrados, pagina), (proyecto) =>
      resumenParaAdministracion(proyecto, colectivosPropios),
    );
  }

  async darDeBajaProyecto({ proyectoId, motivo, actor, ahora = new Date() }) {
    return this.transacciones.ejecutar(async () => {
      const proyecto = await this.proyectoRepository.buscarPorId(proyectoId);
      if (!proyecto) throw new NotFoundError("No existe ese proyecto");
      await this.conflictoDeIntereses.exigirSinConflicto(
        actor.usuarioId,
        proyecto.colectivoId,
      );
      if (proyecto.estaDadoDeBaja()) {
        throw new ConflictError("El proyecto ya esta dado de baja");
      }

      const cambios = darDeBajaProyecto(proyecto, motivo, ahora);
      await this.proyectoRepository.guardar(proyecto);
      await this.revisionRepository.descartarPendientesDeProyecto(proyecto._id, {
        nota: motivo,
        resueltaPor: actor.usuarioId,
        resueltaEn: ahora,
      });
      await notificarResoluciones(this.notificacionService, proyecto, cambios);
      await this.auditoriaService.registrar({
        actor,
        accion: ACCION_ADMINISTRATIVA.PROYECTO_DADO_DE_BAJA,
        entidad: { tipo: TIPO_ENTIDAD_AUDITADA.PROYECTO, id: proyecto._id },
        detalle: { motivo },
      });
      return {
        id: String(proyecto._id),
        estado: proyecto.estado,
        baja: { motivo, fecha: ahora },
      };
    });
  }

  async darDeBajaColectivo({ colectivoId, motivo, actor, ahora = new Date() }) {
    return this.transacciones.ejecutar(async () => {
      const colectivo = await this.colectivoService.buscarPorId(colectivoId);
      await this.conflictoDeIntereses.exigirSinConflicto(actor.usuarioId, colectivo._id);

      const dadoDeBaja = await this.membresiaService.darDeBajaColectivo(colectivo.id, {
        ahora,
      });
      await this.auditoriaService.registrar({
        actor,
        accion: ACCION_ADMINISTRATIVA.COLECTIVO_DADO_DE_BAJA,
        entidad: { tipo: TIPO_ENTIDAD_AUDITADA.COLECTIVO, id: dadoDeBaja._id },
        detalle: { motivo },
      });
      return { id: String(dadoDeBaja._id), fechaBaja: dadoDeBaja.fechaBaja };
    });
  }
}
