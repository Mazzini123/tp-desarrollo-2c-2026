import { SolicitudIngresoModel } from "../models/SolicitudIngresoModel.js";
import { ESTADO_SOLICITUD } from "../domain/enums/ESTADO_SOLICITUD.js";
import { esIdValido } from "./objectIds.js";
import { errorDeDuplicado, esDuplicado } from "./duplicados.js";

export class MongoSolicitudIngresoRepository {
  async crear(datos) {
    try {
      return await new SolicitudIngresoModel(datos).save();
    } catch (error) {
      throw esDuplicado(error)
        ? errorDeDuplicado("Ya hay una solicitud pendiente")
        : error;
    }
  }

  async buscarPorId(id) {
    return esIdValido(id) ? SolicitudIngresoModel.findById(id) : null;
  }

  async buscarPendiente(colectivoId, usuarioId) {
    return SolicitudIngresoModel.findOne({
      colectivoId,
      usuarioId,
      estado: ESTADO_SOLICITUD.PENDIENTE,
    });
  }

  async resolverSiPendiente(id, { estado, resueltaPor = null, fecha = new Date() }) {
    return SolicitudIngresoModel.findOneAndUpdate(
      { _id: id, estado: ESTADO_SOLICITUD.PENDIENTE },
      { $set: { estado, resueltaPor, fechaResolucion: fecha } },
      { returnDocument: "after" },
    );
  }

  async cancelarPendientesDeColectivo(colectivoId, fecha = new Date()) {
    await SolicitudIngresoModel.updateMany(
      { colectivoId, estado: ESTADO_SOLICITUD.PENDIENTE },
      { $set: { estado: ESTADO_SOLICITUD.CANCELADA, fechaResolucion: fecha } },
    );
  }

  async listarDeColectivo(colectivoId, { estado } = {}) {
    return SolicitudIngresoModel.find({ colectivoId, ...(estado && { estado }) }).sort({
      fechaSolicitud: -1,
      _id: -1,
    });
  }

  async listarDeUsuario(usuarioId) {
    return SolicitudIngresoModel.find({ usuarioId }).sort({
      fechaSolicitud: -1,
      _id: -1,
    });
  }
}
