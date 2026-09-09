import { esValorDeEnum } from "../../utils/validaciones.js";

export const TIPO_UBICACION = Object.freeze({
  ARGENTINA: "ARGENTINA",
  PROVINCIA: "PROVINCIA",
  CABA: "CABA",
  LOCALIDAD: "LOCALIDAD",
});

export const esTipoUbicacionValido = (valor) => esValorDeEnum(TIPO_UBICACION, valor);
