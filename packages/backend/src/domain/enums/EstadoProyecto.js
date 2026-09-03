export const EstadoProyecto = Object.freeze({
  ABIERTO: "ABIERTO",
  FINALIZADO: "FINALIZADO",
});

export function esEstadoProyectoValido(valor) {
  return Object.values(EstadoProyecto).includes(valor);
}
