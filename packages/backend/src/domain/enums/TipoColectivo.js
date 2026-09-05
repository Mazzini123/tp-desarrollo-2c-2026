export const TIPO_COLECTIVO = Object.freeze({
  FUNDACION: "FUNDACION",
  ASOCIACION_BARRIAL: "ASOCIACION_BARRIAL",
  ONG: "ONG",
  ASAMBLEA: "ASAMBLEA",
});

export function esTipoColectivoValido(valor) {
  return Object.values(TIPO_COLECTIVO).includes(valor);
}
