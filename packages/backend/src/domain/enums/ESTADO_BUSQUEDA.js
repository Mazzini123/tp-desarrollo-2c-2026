import { esValorDeEnum } from "../../utils/validaciones.js";

export const ESTADO_BUSQUEDA = Object.freeze({
  ABIERTA: "ABIERTA",
  LIMITE_ALCANZADO: "LIMITE_ALCANZADO",
  CERRADA: "CERRADA",
});

export const esEstadoBusquedaValido = (valor) => esValorDeEnum(ESTADO_BUSQUEDA, valor);
