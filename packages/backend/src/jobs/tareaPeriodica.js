export function iniciarTareaPeriodica(nombre, tarea, { intervaloMs }) {
  let temporizador = null;
  let detenido = false;

  const correr = async () => {
    try {
      await tarea();
    } catch (error) {
      console.error(`${nombre}: fallo la revision`, error.message);
    } finally {
      if (!detenido) {
        temporizador = setTimeout(correr, intervaloMs);
        temporizador.unref();
      }
    }
  };

  correr();

  return () => {
    detenido = true;
    clearTimeout(temporizador);
  };
}
