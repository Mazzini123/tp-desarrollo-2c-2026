import { iniciarTareaPeriodica } from "./tareaPeriodica.js";
import { registro } from "../config/registro.js";

export function iniciarCierreAutomatico(proyectoService, { intervaloMs }) {
  return iniciarTareaPeriodica(
    "Cierre automatico",
    async (debeDetenerse) => {
      const cerrados = await proyectoService.cerrarVencidos(new Date(), {
        debeDetenerse,
      });
      if (cerrados.length > 0) {
        registro.info("proyectos_cerrados_por_vencimiento", {
          cantidad: cerrados.length,
        });
      }
    },
    { intervaloMs },
  );
}
