import { esValorDeEnum } from "../../utils/validaciones.js";

export const PROYECTO_ESTADO = Object.freeze({
  ABIERTO: "ABIERTO",
  FINALIZADO: "FINALIZADO",
});

export const esProyectoEstadoValido = (valor) => esValorDeEnum(PROYECTO_ESTADO, valor);
