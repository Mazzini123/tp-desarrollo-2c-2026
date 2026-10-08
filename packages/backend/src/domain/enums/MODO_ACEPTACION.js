import { esValorDeEnum } from "../../utils/validaciones.js";

// Requerimiento adicional 8: como se resuelven las postulaciones de un proyecto.
export const MODO_ACEPTACION = Object.freeze({
  // "No hay rechazos ni aceptaciones automaticas."
  REVISION_MANUAL: "REVISION_MANUAL",
  // "Se aceptan todas las participaciones. Solo se puede usar si no hay limite."
  TODO_SUMA: "TODO_SUMA",
  // "Una vez que se alcanza el limite, se aceptan todas, se cierra la
  // postulacion y se rechazan las demas. Solo se puede usar si hay limite."
  HASTA_LLENAR_VACANTES: "HASTA_LLENAR_VACANTES",
});

export const esModoAceptacionValido = (valor) => esValorDeEnum(MODO_ACEPTACION, valor);
