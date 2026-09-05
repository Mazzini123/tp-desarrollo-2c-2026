export const PERIODO_COMPROMISO = Object.freeze({
  HS_TOTALES: "HS_TOTALES",
  HS_SEMANALES: "HS_SEMANALES",
  HS_MENSUALES: "HS_MENSUALES",
});

export function esPeriodoCompromisoValido(valor) {
  return Object.values(PERIODO_COMPROMISO).includes(valor);
}
