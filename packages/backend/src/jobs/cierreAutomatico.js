// Requerimiento adicional 10: "Cuando se alcance esta fecha, el proyecto se
// cerrara automaticamente."

export function iniciarCierreAutomatico(proyectoService, { intervaloMs }) {
  const revisar = async () => {
    try {
      const cerrados = await proyectoService.cerrarVencidos();
      if (cerrados.length > 0) {
        console.log(`Cierre automatico: ${cerrados.length} proyecto(s) cerrado(s)`);
      }
    } catch (error) {
      console.error("Cierre automatico: fallo la revision", error.message);
    }
  };

  const temporizador = setInterval(revisar, intervaloMs);
  temporizador.unref();
  revisar();

  return () => clearInterval(temporizador);
}
