import mongoose from "mongoose";
import { registro } from "./registro.js";

export function registrarApagado({ servidor, detenerTareas, plazoMs = 25_000 }) {
  let apagando = false;

  async function apagar(motivo, codigo = 0) {
    if (apagando) return;
    apagando = true;
    registro.info("apagado_iniciado", { motivo });

    const limite = setTimeout(() => {
      registro.error("apagado_vencido", { plazoMs });
      process.exit(1);
    }, plazoMs);
    limite.unref();

    try {
      const pedidosPendientes = new Promise((resolver, rechazar) => {
        servidor.close((error) => {
          if (error) rechazar(error);
          else resolver();
        });
      });
      const tareasPendientes = detenerTareas.map((detener) => detener());
      await Promise.all([pedidosPendientes, ...tareasPendientes]);
      await mongoose.disconnect();
      registro.info("apagado_completo");
      process.exitCode = codigo;
    } catch (error) {
      registro.error("apagado_fallido", { error: error.message });
      process.exit(1);
    }
  }

  process.once("SIGTERM", () => apagar("SIGTERM"));
  process.once("SIGINT", () => apagar("SIGINT"));
  return apagar;
}
