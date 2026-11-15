import { registro } from "../config/registro.js";

export function iniciarTareaPeriodica(nombre, tarea, { intervaloMs }) {
  let temporizador = null;
  let detenido = false;
  let ejecucionEnCurso;

  const correr = async () => {
    try {
      await tarea(() => detenido);
    } catch (error) {
      registro.error("tarea_periodica_fallida", { tarea: nombre, error: error.message });
    } finally {
      if (!detenido) {
        temporizador = setTimeout(() => {
          ejecucionEnCurso = correr();
        }, intervaloMs);
        temporizador.unref();
      }
    }
  };

  ejecucionEnCurso = correr();

  return async () => {
    detenido = true;
    clearTimeout(temporizador);
    await ejecucionEnCurso;
  };
}
