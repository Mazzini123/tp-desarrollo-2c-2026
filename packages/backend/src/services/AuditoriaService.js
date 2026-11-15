import { armarPaginado } from "../utils/paginacion.js";

const comoTexto = (id) => (id == null ? null : String(id));

function accionDto(accion) {
  return {
    id: String(accion._id),
    usuarioId: comoTexto(accion.usuarioId),
    contextoId: comoTexto(accion.contextoId),
    accion: accion.accion,
    entidad: { tipo: accion.entidad.tipo, id: String(accion.entidad.id) },
    detalle: accion.detalle ?? {},
    fecha: accion.fecha,
  };
}

export class AuditoriaService {
  constructor({ auditoriaRepository }) {
    this.auditoriaRepository = auditoriaRepository;
  }

  async registrar({ actor = null, accion, entidad, detalle = {} }) {
    await this.auditoriaRepository.registrar({
      usuarioId: actor?.usuarioId ?? null,
      contextoId: actor?.contextoId ?? null,
      accion,
      entidad,
      detalle,
    });
  }

  async listar({ numeroPagina = 1, limitePorPagina = 10, ...filtros } = {}) {
    const pagina = { numeroPagina, limitePorPagina };
    const resultado = armarPaginado(
      await this.auditoriaRepository.listarPaginado(pagina, filtros),
      pagina,
    );
    return { ...resultado, items: resultado.items.map(accionDto) };
  }
}
