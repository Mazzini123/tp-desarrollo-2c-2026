import { isDeepStrictEqual } from "node:util";
import { TIPO_CONTEXTO } from "../security/autorizacion/enums/TIPO_CONTEXTO.js";
import { ContextoUsuarioModel } from "../security/persistencia/ContextoUsuarioModel.js";

const NOMBRE_ANTERIOR = "usuarioId_1_tipo_1";
const INDEX_NOT_FOUND = 27;

export async function migrarIndiceDeColaboradorActivo() {
  const contextos = ContextoUsuarioModel.collection;
  const anterior = (await contextos.indexes()).find(
    ({ name }) => name === NOMBRE_ANTERIOR,
  );
  if (!anterior) return { indiceAnteriorEliminado: false };

  if (
    !anterior.unique ||
    !isDeepStrictEqual(anterior.key, { usuarioId: 1, tipo: 1 }) ||
    !isDeepStrictEqual(anterior.partialFilterExpression, {
      tipo: TIPO_CONTEXTO.COLABORADOR,
    })
  ) {
    throw new Error("El índice de contextos anterior tiene una definición inesperada");
  }

  // Mongo conserva la unicidad de los activos durante todo el reemplazo.
  await ContextoUsuarioModel.createIndexes();
  try {
    await contextos.dropIndex(NOMBRE_ANTERIOR);
  } catch (error) {
    if (error.code !== INDEX_NOT_FOUND) throw error;
    return { indiceAnteriorEliminado: false };
  }
  return { indiceAnteriorEliminado: true };
}
