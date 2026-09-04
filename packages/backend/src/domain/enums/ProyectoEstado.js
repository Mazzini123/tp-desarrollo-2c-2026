export const PROYECTO_ESTADO = Object.freeze({
  ABIERTO: "ABIERTO",
  FINALIZADO: "FINALIZADO",
});

export function esProyectoEstadoValido(valor) {
  return Object.values(PROYECTO_ESTADO).includes(valor);
}
