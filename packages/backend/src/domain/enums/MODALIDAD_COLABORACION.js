import { esValorDeEnum } from "../../utils/validaciones.js";

export const MODALIDAD_COLABORACION = Object.freeze({
  GRATUITA: "GRATUITA",
  OFRECE_INCENTIVO_ECONOMICO: "OFRECE_INCENTIVO_ECONOMICO",
  EXISTE_POSIBILIDAD_DE_CONTRATACION: "EXISTE_POSIBILIDAD_DE_CONTRATACION",
});

export const esModalidadColaboracionValida = (valor) =>
  esValorDeEnum(MODALIDAD_COLABORACION, valor);
