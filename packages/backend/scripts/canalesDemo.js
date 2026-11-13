import { crearCanales } from "../src/composicion.js";

// Adaptacion exclusiva del ejecutable de demo. La API nunca importa este archivo.
export function crearCanalesDemo(entorno) {
  const canales = crearCanales(entorno);
  if (entorno.DEMO_SMS_PLANTILLA) {
    const sms = canales.SMS;
    canales.SMS = {
      enviar(mensaje) {
        return sms.enviar({ ...mensaje, contenido: entorno.DEMO_SMS_PLANTILLA });
      },
    };
  }
  return canales;
}
