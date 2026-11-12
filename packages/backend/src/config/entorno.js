import { isIP } from "node:net";
import { z } from "zod";

export function enteroDeEntorno(
  entorno,
  nombre,
  predeterminado,
  maximo = Number.MAX_SAFE_INTEGER,
) {
  const resultado = z.coerce
    .number()
    .int()
    .min(1)
    .max(maximo)
    .safeParse(entorno[nombre] ?? predeterminado);
  if (!resultado.success)
    throw new Error(`${nombre} debe ser un entero entre 1 y ${maximo}`);
  return resultado.data;
}

export function proxiesConfiables(entorno = process.env) {
  if (!entorno.TRUST_PROXY) return false;
  const lista = entorno.TRUST_PROXY.split(",").map((ip) => ip.trim());
  for (const valor of lista) {
    const [ip, mascara, extra] = valor.split("/");
    const version = isIP(ip);
    if (
      !version ||
      extra !== undefined ||
      (mascara !== undefined &&
        (!/^\d+$/.test(mascara) || Number(mascara) > (version === 4 ? 32 : 128)))
    ) {
      throw new Error("TRUST_PROXY solo admite direcciones IP o redes CIDR explícitas");
    }
  }
  return lista;
}

export function configuracionDeProceso(entorno = process.env) {
  return {
    puerto: enteroDeEntorno(entorno, "SERVER_PORT", 8000, 65535),
    cierreMs: enteroDeEntorno(
      entorno,
      "CIERRE_AUTOMATICO_INTERVALO_MS",
      60_000,
      2_147_483_647,
    ),
    enviosMs: enteroDeEntorno(entorno, "ENVIOS_INTERVALO_MS", 15_000, 2_147_483_647),
    apagadoMs: enteroDeEntorno(entorno, "APAGADO_PLAZO_MS", 25_000, 2_147_483_647),
    proxies: proxiesConfiables(entorno),
  };
}
