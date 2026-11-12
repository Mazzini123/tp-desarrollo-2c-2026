import { iniciarTareaPeriodica } from "./tareaPeriodica.js";
import { registro } from "../config/registro.js";

export function iniciarEnviosPendientes(
  notificacionService,
  { intervaloMs, avisoAutomaticoService },
) {
  return iniciarTareaPeriodica(
    "Envios de notificaciones",
    async (debeDetenerse) => {
      await avisoAutomaticoService?.procesarPendientes(new Date(), { debeDetenerse });
      const { enviados, reintentos, fallidos } =
        await notificacionService.procesarEnviosPendientes(new Date(), { debeDetenerse });
      if (enviados + reintentos + fallidos > 0) {
        registro.info("envios_procesados", { enviados, reintentos, fallidos });
      }
    },
    { intervaloMs },
  );
}
