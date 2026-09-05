export const TIPO_UBICACION = Object.freeze({
  ARGENTINA: "ARGENTINA",
  PROVINCIA: "PROVINCIA",
  CABA: "CABA",
  LOCALIDAD: "LOCALIDAD",
});

export function esTipoUbicacionValido(valor) {
  return Object.values(TIPO_UBICACION).includes(valor);
}
