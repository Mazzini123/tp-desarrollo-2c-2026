import { esValorDeEnum } from "../../utils/validaciones.js";

export const COLABORACION_ESTADO = Object.freeze({
  PENDIENTE: "PENDIENTE",
  ACEPTADA: "ACEPTADA",
  RECHAZADA: "RECHAZADA",
  FINALIZADA: "FINALIZADA",
  DESVINCULADA: "DESVINCULADA",
  RETIRADA: "RETIRADA",
});

export const esColaboracionEstadoValido = (valor) =>
  esValorDeEnum(COLABORACION_ESTADO, valor);
