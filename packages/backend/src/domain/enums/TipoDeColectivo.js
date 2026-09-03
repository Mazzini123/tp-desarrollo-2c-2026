export const TipoDeColectivo = Object.freeze({
  FUNDACION: "FUNDACION",
  ASOCIACION_BARRIAL: "ASOCIACION_BARRIAL",
  ONG: "ONG",
  ASAMBLEA: "ASAMBLEA",
});

export function esTipoDeColectivoValido(valor) {
  return Object.values(TipoDeColectivo).includes(valor);
}
