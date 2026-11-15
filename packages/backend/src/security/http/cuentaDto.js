import { TIPO_CONTEXTO } from "../autorizacion/enums/TIPO_CONTEXTO.js";
import { ROL_CUENTA } from "./ROL_CUENTA.js";

export function cuentaDto(cuenta, sub) {
  const actual = cuenta.contextoActual;
  const esColectivo = actual?.tipo === TIPO_CONTEXTO.COLECTIVO;
  const esAdministracion = actual?.tipo === TIPO_CONTEXTO.ADMINISTRACION;
  const rolDeCuenta = esColectivo
    ? ROL_CUENTA.COLECTIVO
    : esAdministracion
      ? ROL_CUENTA.ADMINISTRACION
      : ROL_CUENTA.COLABORADORA;
  return {
    id: sub,
    rol: actual ? rolDeCuenta : null,
    perfilId: (esColectivo ? actual?.colectivo?.id : actual?.colaborador?.id) ?? null,
    ...cuenta,
  };
}
