import mongoose from "mongoose";
import { UsuarioModel } from "../models/UsuarioModel.js";
import { esIdValido } from "./objectIds.js";

export class MongoUsuarioRepository {
  nuevoId() {
    return new mongoose.Types.ObjectId();
  }

  async buscarPorId(id) {
    return esIdValido(id) ? UsuarioModel.findById(id) : null;
  }

  async buscarVarios(ids) {
    return UsuarioModel.find({ _id: { $in: ids } });
  }

  async asegurar(id) {
    const resultado = await UsuarioModel.findOneAndUpdate(
      { _id: id },
      { $setOnInsert: { contextoActualId: null, nombre: null, fechaAlta: new Date() } },
      { upsert: true, returnDocument: "after", includeResultMetadata: true },
    );
    return {
      usuario: resultado.value,
      creado: !resultado.lastErrorObject?.updatedExisting,
    };
  }

  async fijarContextoActual(usuarioId, contextoId) {
    await UsuarioModel.updateOne(
      { _id: usuarioId },
      { $set: { contextoActualId: contextoId } },
    );
  }

  async cambiarNombre(usuarioId, nombre) {
    return UsuarioModel.findByIdAndUpdate(
      usuarioId,
      { $set: { nombre } },
      { returnDocument: "after", runValidators: true },
    );
  }

  async limpiarContextosActuales(contextoIds) {
    await UsuarioModel.updateMany(
      { contextoActualId: { $in: contextoIds } },
      { $set: { contextoActualId: null } },
    );
  }

  async limpiarContextoActualSi(usuarioId, contextoId) {
    await UsuarioModel.updateOne(
      { _id: usuarioId, contextoActualId: contextoId },
      { $set: { contextoActualId: null } },
    );
  }

  async bloquear(usuarioId) {
    await UsuarioModel.updateOne(
      { _id: usuarioId },
      { $set: { contextosActualizadosEn: new Date() } },
    );
  }
}
