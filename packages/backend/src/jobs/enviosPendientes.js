import { iniciarTareaPeriodica } from "./tareaPeriodica.js";

export function iniciarEnviosPendientes(notificacionService, { intervaloMs }) {
  return iniciarTareaPeriodica(
    "Envios de notificaciones",
    async () => {
      const { enviados, reintentos, fallidos } =
        await notificacionService.procesarEnviosPendientes();
      if (enviados + reintentos + fallidos > 0) {
        console.log(
          `Envios de notificaciones: ${enviados} enviado(s), ${reintentos} a reintentar, ` +
            `${fallidos} fallido(s)`,
        );
      }
    },
    { intervaloMs },
  );
}
