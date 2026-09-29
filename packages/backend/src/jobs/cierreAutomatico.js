// Requerimiento adicional 10: "Cuando se alcance esta fecha, el proyecto se
// cerrara automaticamente."
//
// Un temporizador dentro del mismo proceso revisa cada tanto si hay proyectos
// vencidos. Alcanza porque la API corre en un solo contenedor; con varias
// replicas, cada una cerraria los mismos proyectos y habria que coordinarlas.
//
// Ademas, las operaciones de postulacion revisan la fecha en el momento:
// entre dos pasadas del job nadie puede postularse a un proyecto vencido.
export function iniciarCierreAutomatico(proyectoService, { intervaloMs }) {
  const revisar = async () => {
    try {
      const cerrados = await proyectoService.cerrarVencidos();
      if (cerrados.length > 0) {
        console.log(`Cierre automatico: ${cerrados.length} proyecto(s) cerrado(s)`);
      }
    } catch (error) {
      // Un error de una pasada no puede tirar el proceso: se reintenta en la
      // siguiente.
      console.error("Cierre automatico: fallo la revision", error.message);
    }
  };

  const temporizador = setInterval(revisar, intervaloMs);
  // unref: el temporizador no mantiene vivo al proceso por si solo.
  temporizador.unref();
  revisar();

  return () => clearInterval(temporizador);
}
