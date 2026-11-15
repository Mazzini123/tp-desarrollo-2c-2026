import { iniciarTareaPeriodica } from "./tareaPeriodica.js";
import { registro } from "../config/registro.js";

export function iniciarSeguimiento(revisionService, { intervaloMs }) {
  return iniciarTareaPeriodica(
    "Seguimiento de proyectos",
    async (debeDetenerse) => {
      const marcados = await revisionService.marcarSinActualizaciones({
        ahora: new Date(),
        debeDetenerse,
      });
      if (marcados.length > 0) {
        registro.info("revisiones_creadas_por_seguimiento", {
          cantidad: marcados.length,
        });
      }
    },
    { intervaloMs },
  );
}
