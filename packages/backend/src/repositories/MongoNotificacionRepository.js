import { NotificacionModel } from "../models/NotificacionModel.js";
import { NotificacionInterna } from "../domain/NotificacionInterna.js";

function aDocumento(notificacion) {
  return {
    _id: notificacion.id,
    destinatarioId: notificacion.destinatarioId,
    tipo: notificacion.tipo,
    asunto: notificacion.asunto,
    contenido: notificacion.contenido,
    referencias: notificacion.referencias,
    fecha: notificacion.fecha,
    esLeida: notificacion.esLeida,
    envios: notificacion.envios,
  };
}

function aDominio(documento) {
  if (!documento) {
    return null;
  }

  return new NotificacionInterna({
    id: documento._id,
    destinatarioId: documento.destinatarioId,
    tipo: documento.tipo,
    asunto: documento.asunto,
    contenido: documento.contenido,
    referencias: documento.referencias ?? {},
    fecha: documento.fecha,
    esLeida: documento.esLeida,
    envios: documento.envios ?? [],
  });
}

export class MongoNotificacionRepository {
  async guardar(notificacion) {
    await NotificacionModel.updateOne(
      { _id: notificacion.id },
      { $set: aDocumento(notificacion) },
      { upsert: true },
    );
    return notificacion;
  }

  async buscarPorId(id) {
    return aDominio(await NotificacionModel.findById(id).lean());
  }

  async listarPorDestinatarioPaginado(destinatarioId, numeroPagina, limitePorPagina) {
    const filtro = { destinatarioId };
    const salto = (numeroPagina - 1) * limitePorPagina;

    const [documentos, total] = await Promise.all([
      NotificacionModel.find(filtro)
        .sort({ fecha: -1, _id: 1 })
        .skip(salto)
        .limit(limitePorPagina)
        .lean(),
      NotificacionModel.countDocuments(filtro),
    ]);

    return { items: documentos.map(aDominio), total };
  }
}
