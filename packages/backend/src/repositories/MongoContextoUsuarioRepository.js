import { ContextoUsuarioModel } from "../models/ContextoUsuarioModel.js";
import { TIPO_CONTEXTO } from "../domain/enums/TIPO_CONTEXTO.js";
import { ROL } from "../domain/enums/ROL.js";
import { esIdValido } from "./objectIds.js";

export class MongoContextoUsuarioRepository {
  async crear(datos) {
    return new ContextoUsuarioModel(datos).save();
  }

  async buscarPorId(id) {
    return esIdValido(id) ? ContextoUsuarioModel.findById(id) : null;
  }

  async listarDeUsuario(usuarioId) {
    return ContextoUsuarioModel.find({ usuarioId }).sort({ fechaAlta: 1, _id: 1 });
  }

  async listarActivosDeColectivo(colectivoId) {
    return ContextoUsuarioModel.find({ colectivoId, activo: true }).sort({
      fechaAlta: 1,
      _id: 1,
    });
  }

  async buscarDeUsuarioEnColectivo(usuarioId, colectivoId) {
    return ContextoUsuarioModel.findOne({
      usuarioId,
      colectivoId,
      tipo: TIPO_CONTEXTO.COLECTIVO,
    });
  }

  async buscarColaboradorDeUsuario(usuarioId) {
    return ContextoUsuarioModel.findOne({ usuarioId, tipo: TIPO_CONTEXTO.COLABORADOR });
  }

  async buscarDeColaborador(colaboradorId) {
    return ContextoUsuarioModel.findOne({
      colaboradorId,
      tipo: TIPO_CONTEXTO.COLABORADOR,
    });
  }

  async reactivar(contextoId) {
    await ContextoUsuarioModel.updateOne(
      { _id: contextoId },
      { $set: { activo: true, fechaBaja: null } },
    );
  }

  async desactivarActivosDeColectivo(colectivoId, fecha = new Date()) {
    const activos = await ContextoUsuarioModel.find(
      { colectivoId, activo: true },
      { _id: 1 },
    );
    const ids = activos.map((c) => c._id);
    await ContextoUsuarioModel.updateMany(
      { _id: { $in: ids } },
      { $set: { activo: false, fechaBaja: fecha } },
    );
    return ids;
  }

  async habilitarMembresia(usuarioId, colectivoId) {
    return ContextoUsuarioModel.findOneAndUpdate(
      { usuarioId, colectivoId, tipo: TIPO_CONTEXTO.COLECTIVO },
      {
        $set: { rol: ROL.MIEMBRO, activo: true, fechaBaja: null },
        $setOnInsert: { colaboradorId: null, fechaAlta: new Date() },
      },
      { upsert: true, returnDocument: "after" },
    );
  }

  async desactivarSi(contextoId, condicion = {}, fecha = new Date()) {
    const { modifiedCount } = await ContextoUsuarioModel.updateOne(
      { _id: contextoId, activo: true, ...condicion },
      { $set: { activo: false, fechaBaja: fecha } },
    );
    return modifiedCount === 1;
  }

  async cambiarRolSi(contextoId, condicion, rolNuevo) {
    const { modifiedCount } = await ContextoUsuarioModel.updateOne(
      { _id: contextoId, activo: true, ...condicion },
      { $set: { rol: rolNuevo } },
    );
    return modifiedCount === 1;
  }
}
