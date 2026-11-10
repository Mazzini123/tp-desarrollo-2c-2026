import { iniciarTareaPeriodica } from "./tareaPeriodica.js";

export function iniciarCierreAutomatico(proyectoService, { intervaloMs }) {
  return iniciarTareaPeriodica(
    "Cierre automatico",
    async () => {
      const cerrados = await proyectoService.cerrarVencidos();
      if (cerrados.length > 0) {
        console.log(`Cierre automatico: ${cerrados.length} proyecto(s) cerrado(s)`);
      }
    },
    { intervaloMs },
  );
}
