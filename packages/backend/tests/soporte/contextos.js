import { ContextoUsuarioModel } from "../../src/security/persistencia/ContextoUsuarioModel.js";
import {
  RolModel,
  TipoContextoModel,
} from "../../src/security/persistencia/catalogos.js";

async function idPorNombre(modelo, nombre) {
  const documento = await modelo.findOne({ nombre }).lean();
  if (!documento) throw new Error(`No esta "${nombre}" en ${modelo.collection.name}`);
  return documento._id;
}

export const idDeRol = (nombre) => idPorNombre(RolModel, nombre);
export const idDeTipoDeContexto = (nombre) => idPorNombre(TipoContextoModel, nombre);

export async function conReferencias({ rol, tipo, ...resto }) {
  return {
    ...resto,
    ...(tipo !== undefined && { tipoContextoId: await idDeTipoDeContexto(tipo) }),
    ...(rol !== undefined && { rolId: await idDeRol(rol) }),
  };
}

export async function contextoGuardado(idOFiltro) {
  const esFiltro = idOFiltro && typeof idOFiltro === "object" && !idOFiltro._bsontype;
  const contexto = await (
    esFiltro
      ? ContextoUsuarioModel.findOne(await conReferencias(idOFiltro))
      : ContextoUsuarioModel.findById(idOFiltro)
  ).lean();
  if (!contexto) return null;
  const [rol, tipo] = await Promise.all([
    RolModel.findById(contexto.rolId).lean(),
    TipoContextoModel.findById(contexto.tipoContextoId).lean(),
  ]);
  return { ...contexto, rol: rol?.nombre ?? null, tipo: tipo?.nombre ?? null };
}
