export const NivelUbicacion = Object.freeze({
  ARGENTINA: "ARGENTINA",
  PROVINCIA: "PROVINCIA",
  CABA: "CABA",
  LOCALIDAD: "LOCALIDAD",
});

export function esNivelUbicacionValido(valor) {
  return Object.values(NivelUbicacion).includes(valor);
}
