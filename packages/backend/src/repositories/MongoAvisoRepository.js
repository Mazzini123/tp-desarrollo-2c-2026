import { AvisoPendienteModel } from "../models/AvisoPendienteModel.js";
import { ESTADO_AVISO } from "../domain/enums/ESTADO_AVISO.js";

export class MongoAvisoRepository {
  async encolar(datos) {
    return AvisoPendienteModel.findOneAndUpdate(
      { clave: datos.clave },
      { $setOnInsert: datos },
      { upsert: true, returnDocument: "after", runValidators: true },
    );
  }

  async listarPendientes(ahora, limite) {
    return AvisoPendienteModel.find({
      estado: ESTADO_AVISO.PENDIENTE,
      proximoIntento: { $lte: ahora },
    })
      .sort({ fecha: 1, _id: 1 })
      .limit(limite);
  }

  async actualizar(aviso, cambios) {
    return AvisoPendienteModel.updateOne({ _id: aviso._id }, { $set: cambios });
  }
}
