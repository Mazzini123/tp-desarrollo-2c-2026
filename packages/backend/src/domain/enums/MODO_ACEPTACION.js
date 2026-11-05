import { esValorDeEnum } from "../../utils/validaciones.js";

// Requerimiento adicional 8: como se resuelven las postulaciones de un proyecto.
export const MODO_ACEPTACION = Object.freeze({
  REVISION_MANUAL: "REVISION_MANUAL",
  TODO_SUMA: "TODO_SUMA",
  HASTA_LLENAR_VACANTES: "HASTA_LLENAR_VACANTES",
});

export const esModoAceptacionValido = (valor) => esValorDeEnum(MODO_ACEPTACION, valor);
