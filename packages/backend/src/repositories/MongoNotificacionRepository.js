import { NotificacionModel } from "../models/NotificacionModel.js";
import { esIdValido } from "./ids.js";

export class MongoNotificacionRepository {
  async guardar(notificacion) {
    return notificacion.save();
  }

  async buscarPorId(id) {
    return esIdValido(id) ? NotificacionModel.findById(id) : null;
  }

  async listarPorDestinatarioPaginado(destinatarioId, numeroPagina, limitePorPagina) {
    const filtro = { destinatarioId };
    const salto = (numeroPagina - 1) * limitePorPagina;

    const [items, total] = await Promise.all([
      NotificacionModel.find(filtro)
        .sort({ fecha: -1, _id: 1 })
        .skip(salto)
        .limit(limitePorPagina),
      NotificacionModel.countDocuments(filtro),
    ]);

    return { items, total };
  }
}
