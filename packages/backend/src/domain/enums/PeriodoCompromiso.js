import { esValorDeEnum } from "../../utils/validaciones.js";

export const PERIODO_COMPROMISO = Object.freeze({
  HS_TOTALES: "HS_TOTALES",
  HS_SEMANALES: "HS_SEMANALES",
  HS_MENSUALES: "HS_MENSUALES",
});

export const esPeriodoCompromisoValido = (valor) => esValorDeEnum(PERIODO_COMPROMISO, valor);
