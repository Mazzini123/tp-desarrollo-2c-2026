import { TIPO_CONTEXTO } from "../autorizacion/enums/TIPO_CONTEXTO.js";

export function colectivoDelContexto(contexto) {
  return contexto?.tipo === TIPO_CONTEXTO.COLECTIVO ? String(contexto.colectivoId) : null;
}

export function colaboradorDelContexto(contexto) {
  return contexto?.tipo === TIPO_CONTEXTO.COLABORADOR
    ? String(contexto.colaboradorId)
    : null;
}
