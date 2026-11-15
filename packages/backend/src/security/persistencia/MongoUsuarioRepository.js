import { UsuarioModel } from "./UsuarioModel.js";
import { ContextoUsuarioModel } from "./ContextoUsuarioModel.js";
import { IdentidadExternaModel } from "./IdentidadExternaModel.js";
import { exigirReferencia } from "./integridadReferencial.js";
import { NotFoundError } from "../../errors/NotFoundError.js";
import { DuplicadoError } from "../../errors/DuplicadoError.js";
import { esIdValido } from "../../repositories/objectIds.js";

export class MongoUsuarioRepository {
  async buscarPorId(id) {
    return esIdValido(id) ? UsuarioModel.findById(id) : null;
  }

  async buscarPorIdentidad(identidadExternaId) {
    return UsuarioModel.findOne({ identidadExternaId });
  }

  async buscarVarios(ids) {
    return UsuarioModel.find({ _id: { $in: ids } });
  }

  async asegurarDeIdentidad(identidadExternaId) {
    await exigirReferencia(
      IdentidadExternaModel,
      identidadExternaId,
      "la identidad externa",
    );
    try {
      const resultado = await UsuarioModel.findOneAndUpdate(
        { identidadExternaId },
        { $setOnInsert: { contextoActualId: null, nombre: null, fechaAlta: new Date() } },
        { upsert: true, returnDocument: "after", includeResultMetadata: true },
      );
      return {
        usuario: resultado.value,
        creado: !resultado.lastErrorObject?.updatedExisting,
      };
    } catch (error) {
      if (error.code === 11000) {
        throw new DuplicadoError("La identidad externa ya tiene un usuario");
      }
      throw error;
    }
  }

  async fijarContextoActual(usuarioId, contextoId) {
    if (contextoId !== null) {
      const propio = await ContextoUsuarioModel.exists({
        _id: contextoId,
        usuarioId,
        activo: true,
      });
      if (!propio) {
        throw new Error(
          "Referencia invalida: el contexto actual debe ser un contexto activo del usuario",
        );
      }
    }
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
    if (!(await this.bloquearSi(usuarioId))) {
      throw new NotFoundError("No existe el usuario");
    }
  }

  async bloquearSi(usuarioId, condiciones = {}) {
    const { matchedCount } = await UsuarioModel.updateOne(
      { _id: usuarioId, ...condiciones },
      { $inc: { versionContextos: 1 } },
    );
    return matchedCount === 1;
  }
}
