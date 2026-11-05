import { esValorDeEnum } from "../../utils/validaciones.js";

export const AUTOR_VALORACION = Object.freeze({
  COLECTIVO: "COLECTIVO",
  COLABORADOR: "COLABORADOR",
});

export const esAutorValoracionValido = (valor) => esValorDeEnum(AUTOR_VALORACION, valor);
