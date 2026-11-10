import mongoose from "mongoose";
import { ColectivoModel } from "../models/ColectivoModel.js";
import { ColaboradorModel } from "../models/ColaboradorModel.js";
import { UsuarioModel } from "../models/UsuarioModel.js";
import { IdentidadExternaModel } from "../models/IdentidadExternaModel.js";
import { ContextoUsuarioModel } from "../models/ContextoUsuarioModel.js";
import { TIPO_CONTEXTO } from "../domain/enums/TIPO_CONTEXTO.js";
import { ROL } from "../domain/enums/ROL.js";

const PROVEEDOR_LEGADO = "logto";

export async function migrarCuentasAContextos({
  proveedor = PROVEEDOR_LEGADO,
  ahora = new Date(),
} = {}) {
  const informe = {
    usuariosCreados: 0,
    contextosDeColectivo: 0,
    contextosDeColaborador: 0,
    colectivosSinLider: [],
    conflictos: [],
  };

  async function asegurarUsuario(sub) {
    const identidad = await IdentidadExternaModel.findOneAndUpdate(
      { proveedor, sub },
      { $setOnInsert: { usuarioId: new mongoose.Types.ObjectId(), fechaAlta: ahora } },
      { upsert: true, returnDocument: "after" },
    );
    const { upsertedCount } = await UsuarioModel.updateOne(
      { _id: identidad.usuarioId },
      { $setOnInsert: { contextoActualId: null, nombre: null, fechaAlta: ahora } },
      { upsert: true },
    );
    informe.usuariosCreados += upsertedCount;
    return identidad.usuarioId;
  }

  const fijarActualSiFalta = (usuarioId, contextoId) =>
    UsuarioModel.updateOne(
      { _id: usuarioId, contextoActualId: null },
      { $set: { contextoActualId: contextoId } },
    );

  const colectivos = await ColectivoModel.find(
    { cuentaId: { $type: "string" }, fechaBaja: null },
    { cuentaId: 1 },
  ).lean();
  for (const colectivo of colectivos) {
    const usuarioId = await asegurarUsuario(colectivo.cuentaId);
    const yaTieneLider = await ContextoUsuarioModel.exists({
      colectivoId: colectivo._id,
      rol: ROL.LIDER,
      activo: true,
    });
    const resultado = await ContextoUsuarioModel.findOneAndUpdate(
      { usuarioId, colectivoId: colectivo._id, tipo: TIPO_CONTEXTO.COLECTIVO },
      {
        $setOnInsert: {
          rol: yaTieneLider ? ROL.MIEMBRO : ROL.LIDER,
          activo: true,
          colaboradorId: null,
          fechaAlta: ahora,
          fechaBaja: null,
        },
      },
      { upsert: true, returnDocument: "after", includeResultMetadata: true },
    );
    if (!resultado.lastErrorObject?.updatedExisting) informe.contextosDeColectivo += 1;
    await fijarActualSiFalta(usuarioId, resultado.value._id);
  }

  const colaboradores = await ColaboradorModel.find(
    { cuentaId: { $type: "string" } },
    { cuentaId: 1 },
  ).lean();
  for (const colaborador of colaboradores) {
    const usuarioId = await asegurarUsuario(colaborador.cuentaId);
    const existente = await ContextoUsuarioModel.findOne({
      usuarioId,
      tipo: TIPO_CONTEXTO.COLABORADOR,
    });
    if (existente) {
      if (String(existente.colaboradorId) !== String(colaborador._id)) {
        informe.conflictos.push(
          `La cuenta ${colaborador.cuentaId} ya tiene otro perfil de colaboradora`,
        );
      }
      continue;
    }
    const conColectivo = await ContextoUsuarioModel.exists({
      usuarioId,
      tipo: TIPO_CONTEXTO.COLECTIVO,
      activo: true,
    });
    if (conColectivo) {
      informe.conflictos.push(
        `La cuenta ${colaborador.cuentaId} tiene colectivo y colaboradora: se deja solo el colectivo`,
      );
      continue;
    }
    const contexto = await ContextoUsuarioModel.create({
      usuarioId,
      tipo: TIPO_CONTEXTO.COLABORADOR,
      colaboradorId: colaborador._id,
      rol: ROL.COLABORADOR,
      fechaAlta: ahora,
    });
    informe.contextosDeColaborador += 1;
    await fijarActualSiFalta(usuarioId, contexto._id);
  }

  const activos = await ColectivoModel.find({ fechaBaja: null }, { nombre: 1 }).lean();
  for (const colectivo of activos) {
    const tieneLider = await ContextoUsuarioModel.exists({
      colectivoId: colectivo._id,
      rol: ROL.LIDER,
      activo: true,
    });
    if (!tieneLider)
      informe.colectivosSinLider.push(`${colectivo._id} (${colectivo.nombre})`);
  }

  try {
    await ColectivoModel.collection.dropIndex("cuentaId_1");
  } catch (error) {
    if (error.codeName !== "IndexNotFound" && error.codeName !== "NamespaceNotFound") {
      throw error;
    }
  }

  return informe;
}
