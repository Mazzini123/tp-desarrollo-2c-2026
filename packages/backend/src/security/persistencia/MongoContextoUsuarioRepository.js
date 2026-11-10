import { ContextoUsuarioModel } from "./ContextoUsuarioModel.js";
import { TIPO_CONTEXTO } from "../autorizacion/enums/TIPO_CONTEXTO.js";
import { ROL } from "../autorizacion/enums/ROL.js";
import { esIdValido } from "../../repositories/objectIds.js";

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

  async existeActivoDeTipo(usuarioId, tipo) {
    return Boolean(await ContextoUsuarioModel.exists({ usuarioId, tipo, activo: true }));
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

  async buscarDeColaborador(colaboradorId) {
    return ContextoUsuarioModel.findOne({
      colaboradorId,
      tipo: TIPO_CONTEXTO.COLABORADOR,
    });
  }

  async bloquearSi(contextoId, condicion) {
    const { matchedCount } = await ContextoUsuarioModel.updateOne(
      { _id: contextoId, activo: true, ...condicion },
      { $inc: { __v: 1 } },
    );
    return matchedCount === 1;
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
      { usuarioId, colectivoId, tipo: TIPO_CONTEXTO.COLECTIVO, activo: false },
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
