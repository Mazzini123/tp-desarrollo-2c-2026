import { TIPO_CONTEXTO } from "../autorizacion/enums/TIPO_CONTEXTO.js";
import { ROL_CUENTA } from "./ROL_CUENTA.js";

export function cuentaDto(cuenta, sub) {
  const actual = cuenta.contextoActual;
  const esColectivo = actual?.tipo === TIPO_CONTEXTO.COLECTIVO;
  return {
    id: sub,
    rol: actual ? (esColectivo ? ROL_CUENTA.COLECTIVO : ROL_CUENTA.COLABORADORA) : null,
    perfilId: (esColectivo ? actual?.colectivo?.id : actual?.colaborador?.id) ?? null,
    ...cuenta,
  };
}
