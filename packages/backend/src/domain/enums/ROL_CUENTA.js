import { esValorDeEnum } from "../../utils/validaciones.js";

export const ROL_CUENTA = Object.freeze({
  COLECTIVO: "COLECTIVO",
  COLABORADORA: "COLABORADORA",
});

export const esRolCuentaValido = (valor) => esValorDeEnum(ROL_CUENTA, valor);
