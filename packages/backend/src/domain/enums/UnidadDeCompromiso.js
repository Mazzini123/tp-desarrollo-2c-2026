export const UnidadDeCompromiso = Object.freeze({
  HORAS_TOTALES: "HORAS_TOTALES",
  HORAS_SEMANALES: "HORAS_SEMANALES",
  HORAS_MENSUALES: "HORAS_MENSUALES",
});

export function esUnidadDeCompromisoValida(valor) {
  return Object.values(UnidadDeCompromiso).includes(valor);
}
