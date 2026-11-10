import { NotificacionModel } from "../models/NotificacionModel.js";
import { esIdValido } from "./objectIds.js";
import { ESTADO_ENVIO } from "../domain/enums/ESTADO_ENVIO.js";

export class MongoNotificacionRepository {
  async crear(datos) {
    return new NotificacionModel(datos).save();
  }

  async guardar(notificacion) {
    return notificacion.save();
  }

  async buscarPorId(id) {
    return esIdValido(id) ? NotificacionModel.findById(id) : null;
  }

  async existeInvitacion(destinatarioId, perfilId) {
    return Boolean(
      await NotificacionModel.exists({
        destinatarioId,
        tipo: "INVITACION",
        "referencias.perfilId": String(perfilId),
      }),
    );
  }

  async contarNoLeidas(destinatarioId) {
    return NotificacionModel.countDocuments({ destinatarioId, esLeida: { $ne: true } });
  }

  async listarPorDestinatarioPaginado(
    destinatarioId,
    numeroPagina,
    limitePorPagina,
    { leida } = {},
  ) {
    const filtro = {
      destinatarioId,
      ...(leida === undefined ? {} : { esLeida: leida ? true : { $ne: true } }),
    };
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

  async tomarEnvioPendiente(ahora, reservaHasta) {
    const notificacion = await NotificacionModel.findOneAndUpdate(
      {
        envios: {
          $elemMatch: {
            estado: ESTADO_ENVIO.PENDIENTE,
            proximoIntento: { $lte: ahora },
            $or: [{ enProcesoHasta: null }, { enProcesoHasta: { $lte: ahora } }],
          },
        },
      },
      { $set: { "envios.$.enProcesoHasta": reservaHasta } },
      { returnDocument: "after", sort: { fecha: 1, _id: 1 } },
    );
    if (!notificacion) return null;
    const envio = notificacion.envios.find(
      (e) =>
        e.estado === ESTADO_ENVIO.PENDIENTE &&
        e.enProcesoHasta?.getTime() === reservaHasta.getTime(),
    );
    return { notificacion, envio };
  }

  async actualizarEnvio(notificacionId, envioId, cambios) {
    const set = Object.fromEntries(
      Object.entries(cambios).map(([campo, valor]) => [`envios.$.${campo}`, valor]),
    );
    await NotificacionModel.updateOne(
      { _id: notificacionId, "envios._id": envioId },
      { $set: set },
    );
  }
}
