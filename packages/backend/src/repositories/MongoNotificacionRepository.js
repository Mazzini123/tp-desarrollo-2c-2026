import { randomUUID } from "node:crypto";
import { NotificacionModel } from "../models/NotificacionModel.js";
import { esIdValido } from "./objectIds.js";
import { paginar } from "./paginar.js";
import { ESTADO_ENVIO } from "../domain/enums/ESTADO_ENVIO.js";
import { TIPO_NOTIFICACION } from "../domain/enums/TIPO_NOTIFICACION.js";

export class MongoNotificacionRepository {
  async crear(datos) {
    if (!datos.clave) return new NotificacionModel(datos).save();
    return NotificacionModel.findOneAndUpdate(
      { clave: datos.clave },
      { $setOnInsert: datos },
      { upsert: true, returnDocument: "after", runValidators: true },
    );
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
        tipo: TIPO_NOTIFICACION.INVITACION,
        "referencias.perfilId": String(perfilId),
      }),
    );
  }

  async contarNoLeidas(destinatarioId) {
    return NotificacionModel.countDocuments({ destinatarioId, esLeida: { $ne: true } });
  }

  async listarPorDestinatarioPaginado(destinatarioId, pagina, { leida } = {}) {
    const filtro = {
      destinatarioId,
      ...(leida === undefined ? {} : { esLeida: leida ? true : { $ne: true } }),
    };
    return paginar(NotificacionModel, filtro, pagina, { orden: { fecha: -1, _id: 1 } });
  }

  async tomarEnvioPendiente(ahora, reservaHasta) {
    const reservaId = randomUUID();
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
      {
        $set: {
          "envios.$.enProcesoHasta": reservaHasta,
          "envios.$.reservaId": reservaId,
        },
      },
      { returnDocument: "after", sort: { fecha: 1, _id: 1 } },
    );
    if (!notificacion) return null;
    const envio = notificacion.envios.find(
      (e) => e.estado === ESTADO_ENVIO.PENDIENTE && e.reservaId === reservaId,
    );
    return { notificacion, envio };
  }

  async actualizarEnvio(notificacionId, envioId, reservaId, cambios) {
    const set = Object.fromEntries(
      Object.entries(cambios).map(([campo, valor]) => [`envios.$.${campo}`, valor]),
    );
    const resultado = await NotificacionModel.updateOne(
      {
        _id: notificacionId,
        envios: {
          $elemMatch: { _id: envioId, reservaId, estado: ESTADO_ENVIO.PENDIENTE },
        },
      },
      { $set: set },
    );
    return resultado.matchedCount === 1;
  }
}
