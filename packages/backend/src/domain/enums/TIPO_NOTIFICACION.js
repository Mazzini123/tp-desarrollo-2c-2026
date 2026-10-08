import { esValorDeEnum } from "../../utils/validaciones.js";

export const TIPO_NOTIFICACION = Object.freeze({
  // Un colectivo invita a la persona a sumarse a un perfil de su proyecto.
  INVITACION: "INVITACION",
  // Aviso automatico: hay proyectos que coinciden con sus habilidades.
  PROYECTOS_COMPATIBLES: "PROYECTOS_COMPATIBLES",
  // Resultado de una postulacion.
  POSTULACION_ACEPTADA: "POSTULACION_ACEPTADA",
  POSTULACION_RECHAZADA: "POSTULACION_RECHAZADA",
  // La colaboracion termino: ya se puede valorar al colectivo.
  COLABORACION_FINALIZADA: "COLABORACION_FINALIZADA",
});

export const esTipoNotificacionValido = (valor) => esValorDeEnum(TIPO_NOTIFICACION, valor);
