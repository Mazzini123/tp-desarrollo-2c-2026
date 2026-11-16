import {
  ACCION_ADMINISTRATIVA,
  TIPO_ENTIDAD_AUDITADA,
} from "../domain/enums/ACCION_ADMINISTRATIVA.js";
import { MOTIVO_REVISION } from "../domain/enums/MOTIVO_REVISION.js";
import { ConflictError } from "../errors/ConflictError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { registro } from "../config/registro.js";
import { armarPaginado } from "../utils/paginacion.js";
import { debeMarcarse } from "./reglasDeSeguimiento.js";
import { verificarPublicable } from "./reglasDePublicacion.js";
import { ESTADO_REVISION } from "../domain/enums/ESTADO_REVISION.js";

const comoTexto = (id) => (id == null ? null : String(id));

function revisionDto(revision, proyecto = null) {
  return {
    id: String(revision._id),
    proyecto: proyecto
      ? {
          id: String(proyecto._id),
          titulo: proyecto.titulo,
          colectivo: {
            id: String(proyecto.colectivoId),
            nombre: proyecto.datosDelColectivo.nombre,
          },
        }
      : { id: String(revision.proyectoId) },
    motivo: revision.motivo,
    estado: revision.estado,
    creadaEn: revision.creadaEn,
    resueltaPor: comoTexto(revision.resueltaPor),
    resueltaEn: revision.resueltaEn,
    nota: revision.nota,
  };
}

export class RevisionService {
  constructor({
    transacciones,
    revisionRepository,
    proyectoRepository,
    colaboracionRepository,
    auditoriaService,
    conflictoDeIntereses,
    diasSinActualizaciones,
    avisoAutomaticoService,
  }) {
    this.avisoAutomaticoService = avisoAutomaticoService;
    this.transacciones = transacciones;
    this.revisionRepository = revisionRepository;
    this.proyectoRepository = proyectoRepository;
    this.colaboracionRepository = colaboracionRepository;
    this.auditoriaService = auditoriaService;
    this.conflictoDeIntereses = conflictoDeIntereses;
    this.diasSinActualizaciones = diasSinActualizaciones;
  }

  async marcarSinActualizaciones({
    ahora = new Date(),
    debeDetenerse = () => false,
  } = {}) {
    const proyectos = await this.proyectoRepository.buscarAbiertosParaSeguimiento();
    const ids = proyectos.map((proyecto) => proyecto._id);
    const aceptaciones =
      await this.colaboracionRepository.ultimaAceptacionPorProyecto(ids);
    const resoluciones = await this.revisionRepository.ultimaResolucionPorProyecto(
      ids,
      MOTIVO_REVISION.SIN_ACTUALIZACIONES,
    );

    const marcados = [];
    for (const proyecto of proyectos) {
      if (debeDetenerse()) break;
      const id = String(proyecto._id);
      const corresponde = debeMarcarse({
        proyecto,
        ultimaAceptacion: aceptaciones.get(id) ?? null,
        ultimaResolucion: resoluciones.get(id) ?? null,
        ahora,
        dias: this.diasSinActualizaciones,
      });
      if (!corresponde) continue;
      try {
        const creada = await this.revisionRepository.crearPendiente({
          proyectoId: proyecto._id,
          motivo: MOTIVO_REVISION.SIN_ACTUALIZACIONES,
          creadaEn: ahora,
        });
        if (creada) marcados.push(creada);
      } catch (error) {
        registro.error("seguimiento_fallido", { proyectoId: id, error: error.message });
      }
    }
    return marcados;
  }

  async listar({ numeroPagina = 1, limitePorPagina = 10, ...filtros } = {}) {
    const pagina = { numeroPagina, limitePorPagina };
    const resultado = armarPaginado(
      await this.revisionRepository.listarPaginado(pagina, filtros),
      pagina,
    );
    const proyectos = await this.proyectoRepository.buscarTitulos(
      resultado.items.map((revision) => revision.proyectoId),
    );
    const porId = new Map(proyectos.map((proyecto) => [String(proyecto._id), proyecto]));
    return {
      ...resultado,
      items: resultado.items.map((revision) =>
        revisionDto(revision, porId.get(String(revision.proyectoId))),
      ),
    };
  }

  async resolver({ revisionId, estado, nota = null, actor, ahora = new Date() }) {
    return this.transacciones.ejecutar(async () => {
      const revision = await this.revisionRepository.buscarPorId(revisionId);
      if (!revision) throw new NotFoundError("No existe esa revision");

      const colectivoId = await this.proyectoRepository.buscarColectivoId(
        revision.proyectoId,
      );
      if (colectivoId) {
        await this.conflictoDeIntereses.exigirSinConflicto(actor.usuarioId, colectivoId);
      }

      if (revision.motivo === MOTIVO_REVISION.PUBLICACION) {
        return this.resolverPublicacion({ revision, estado, nota, actor, ahora });
      }

      const resuelta = await this.revisionRepository.resolverSiPendiente(revisionId, {
        estado,
        nota,
        resueltaPor: actor.usuarioId,
        resueltaEn: ahora,
      });
      if (!resuelta) throw new ConflictError("La revision ya fue resuelta");

      await this.auditoriaService.registrar({
        actor,
        accion: ACCION_ADMINISTRATIVA.REVISION_RESUELTA,
        entidad: { tipo: TIPO_ENTIDAD_AUDITADA.REVISION, id: resuelta._id },
        detalle: { estado, motivo: resuelta.motivo },
      });
      return revisionDto(resuelta);
    });
  }

  async resolverPublicacion({ revision, estado, nota, actor, ahora }) {
    const proyecto = await this.proyectoRepository.buscarPorId(revision.proyectoId);
    if (!proyecto?.estaEnRevision()) {
      throw new ConflictError("El proyecto ya no está esperando su publicación");
    }
    const aprobada = estado === ESTADO_REVISION.REVISADA;
    if (aprobada) {
      verificarPublicable(proyecto, ahora);
      proyecto.aprobarPublicacion(ahora);
    } else {
      proyecto.rechazarPublicacion(nota, ahora);
    }

    const resuelta = await this.revisionRepository.resolverSiPendiente(revision._id, {
      estado,
      nota,
      resueltaPor: actor.usuarioId,
      resueltaEn: ahora,
    });
    if (!resuelta) throw new ConflictError("La revision ya fue resuelta");

    await this.proyectoRepository.guardar(proyecto);
    await this.auditoriaService.registrar({
      actor,
      accion: aprobada
        ? ACCION_ADMINISTRATIVA.PROYECTO_PUBLICADO
        : ACCION_ADMINISTRATIVA.PUBLICACION_RECHAZADA,
      entidad: { tipo: TIPO_ENTIDAD_AUDITADA.PROYECTO, id: proyecto._id },
      detalle: { revisionId: String(resuelta._id) },
    });
    if (aprobada) await this.avisoAutomaticoService.avisarPorProyectoNuevo(proyecto);
    return revisionDto(resuelta);
  }
}
