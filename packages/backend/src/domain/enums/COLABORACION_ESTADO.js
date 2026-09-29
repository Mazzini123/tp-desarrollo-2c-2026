import { esValorDeEnum } from "../../utils/validaciones.js";

// Ciclo de vida de una postulacion:
//
//   PENDIENTE ──> ACEPTADA ──> FINALIZADA
//       └───────> RECHAZADA
export const COLABORACION_ESTADO = Object.freeze({
  PENDIENTE: "PENDIENTE",
  ACEPTADA: "ACEPTADA",
  RECHAZADA: "RECHAZADA",
  FINALIZADA: "FINALIZADA",
});

export const esColaboracionEstadoValido = (valor) => esValorDeEnum(COLABORACION_ESTADO, valor);
