import { ContextoUsuarioModel } from "../../src/security/persistencia/ContextoUsuarioModel.js";
import {
  RolModel,
  TipoContextoModel,
} from "../../src/security/persistencia/catalogos.js";

// Los contextos guardan referencias (rolId, tipoContextoId) a los catalogos
// `roles` y `tiposContexto`. Estas ayudas dejan que un test hable de "LIDER" o
// "COLECTIVO" y traducen a las referencias reales de la base.

async function idPorNombre(modelo, nombre) {
  const documento = await modelo.findOne({ nombre }).lean();
  if (!documento) throw new Error(`No esta "${nombre}" en ${modelo.collection.name}`);
  return documento._id;
}

export const idDeRol = (nombre) => idPorNombre(RolModel, nombre);
export const idDeTipoDeContexto = (nombre) => idPorNombre(TipoContextoModel, nombre);

// { rol: "LIDER", tipo: "COLECTIVO", ...resto } -> { rolId, tipoContextoId, ...resto }
export async function conReferencias({ rol, tipo, ...resto }) {
  return {
    ...resto,
    ...(tipo !== undefined && { tipoContextoId: await idDeTipoDeContexto(tipo) }),
    ...(rol !== undefined && { rolId: await idDeRol(rol) }),
  };
}

// El contexto guardado (por id o por filtro) con los nombres de su rol y de su
// tipo resueltos contra los catalogos, para comparar con toMatchObject.
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
