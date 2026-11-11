import { TIPO_EVENTO_TIMELINE } from "../domain/enums/TIPO_EVENTO_TIMELINE.js";

export class TimelineService {
  constructor({ colectivoService, proyectoRepository, colaboracionRepository }) {
    this.colectivoService = colectivoService;
    this.proyectoRepository = proyectoRepository;
    this.colaboracionRepository = colaboracionRepository;
  }

  async timeline(id) {
    const colectivo = await this.colectivoService.buscarPorId(id);
    const [proyectos, finalizadas] = await Promise.all([
      this.proyectoRepository.buscarParaTimeline(id),
      this.colaboracionRepository.finalizadasDeColectivo(id),
    ]);
    const finalizadasPorProyecto = agruparPorProyecto(finalizadas);
    const eventos = [
      evento(TIPO_EVENTO_TIMELINE.ALTA_DEL_COLECTIVO, colectivo.fechaAlta),
      evento(TIPO_EVENTO_TIMELINE.BAJA_DEL_COLECTIVO, colectivo.fechaBaja),
    ];

    for (const proyecto of proyectos) {
      const id = String(proyecto._id);
      const delProyecto = { proyecto: { id, titulo: proyecto.titulo } };

      eventos.push(
        evento(TIPO_EVENTO_TIMELINE.PROYECTO_CREADO, proyecto.fechaCreacion, delProyecto),
        evento(
          TIPO_EVENTO_TIMELINE.PROYECTO_FINALIZADO,
          proyecto.fechaFinalizacion,
          delProyecto,
        ),
        ...proyecto.logros.map((logro) =>
          evento(TIPO_EVENTO_TIMELINE.LOGRO, logro.fecha, {
            ...delProyecto,
            logro: { titulo: logro.titulo, descripcion: logro.descripcion },
          }),
        ),
        ...proyecto.avances.map((avance) =>
          evento(TIPO_EVENTO_TIMELINE.AVANCE, avance.fecha, {
            ...delProyecto,
            avance: {
              porcentajeConcrecion: avance.porcentajeConcrecion,
              urlSistema: avance.urlSistema,
              urlRepositorio: avance.urlRepositorio,
            },
          }),
        ),
        ...(finalizadasPorProyecto.get(id) ?? []).map((c) =>
          evento(TIPO_EVENTO_TIMELINE.COLABORACION_CERRADA, c.fechaFin, {
            ...delProyecto,
            colaborador: autorVisible(c),
          }),
        ),
      );
    }

    return eventos.filter((e) => e.fecha).sort((a, b) => a.fecha - b.fecha);
  }
}

function agruparPorProyecto(colaboraciones) {
  const porProyecto = new Map();
  for (const colaboracion of colaboraciones) {
    const id = String(colaboracion.proyectoId);
    porProyecto.set(id, [...(porProyecto.get(id) ?? []), colaboracion]);
  }
  return porProyecto;
}

function autorVisible(colaboracion) {
  if (!colaboracion.esPublica || !colaboracion.colaborador) return null;
  return {
    id: colaboracion.colaborador.id,
    nombre: colaboracion.colaborador.nombreParaMostrar(),
  };
}

function evento(tipo, fecha, datos = {}) {
  return { tipo, fecha, ...datos };
}
