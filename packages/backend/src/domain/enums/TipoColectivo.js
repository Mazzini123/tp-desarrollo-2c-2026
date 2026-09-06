import { esValorDeEnum } from "../../utils/validaciones.js";

export const TIPO_COLECTIVO = Object.freeze({
  FUNDACION: "FUNDACION",
  ASOCIACION_BARRIAL: "ASOCIACION_BARRIAL",
  ONG: "ONG",
  ASAMBLEA: "ASAMBLEA",
});

export const esTipoColectivoValido = (valor) => esValorDeEnum(TIPO_COLECTIVO, valor);
