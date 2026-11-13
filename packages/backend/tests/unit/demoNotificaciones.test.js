import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { jest } from "@jest/globals";
import { crearCanalesDemo } from "../../scripts/canalesDemo.js";
import { crearCanales } from "../../src/composicion.js";

const script = fileURLToPath(
  new URL("../../scripts/demoNotificaciones.js", import.meta.url),
);

test("la demo rechaza produccion antes de conectar o enviar mensajes", () => {
  const resultado = spawnSync(
    process.execPath,
    [script, "--enviar", "--email", "demo@example.org"],
    {
      env: { ...process.env, NODE_ENV: "production" },
      encoding: "utf8",
      timeout: 10000,
    },
  );
  expect(resultado.status).toBe(1);
  expect(resultado.stderr).toContain("fuera de NODE_ENV=production");
  expect(resultado.stdout).not.toContain("Preparando una base");
});

test("la ayuda explica el modo real y el aislamiento sin iniciar MongoDB", () => {
  const resultado = spawnSync(process.execPath, [script, "--help"], {
    encoding: "utf8",
    timeout: 10000,
  });
  expect(resultado.status).toBe(0);
  expect(resultado.stdout).toContain("--enviar");
  expect(resultado.stdout).toContain("No usa MONGO_URI");
});

test("la plantilla Trial modifica solo la copia SMS de la demo y no el canal productivo", async () => {
  const entorno = {
    TWILIO_ACCOUNT_SID: `AC${"0".repeat(32)}`,
    TWILIO_AUTH_TOKEN: "token-prueba",
    TWILIO_SMS_REMITENTE: "+12345678910",
    DEMO_SMS_PLANTILLA: "sms_event_notifications",
  };
  const enviar = jest.fn().mockResolvedValue({ sid: "SMprueba" });
  const spy = jest
    .spyOn((await import("../../src/canales/CanalSMS.js")).CanalSMS.prototype, "enviar")
    .mockImplementation(enviar);
  try {
    const mensaje = {
      destino: "+5491155551234",
      contenido: "Invitacion normal",
      asunto: "Demo",
    };
    await crearCanalesDemo(entorno).SMS.enviar(mensaje);
    expect(enviar.mock.calls[0][0].contenido).toBe("sms_event_notifications");
    expect(mensaje.contenido).toBe("Invitacion normal");
    await crearCanales(entorno).SMS.enviar(mensaje);
    expect(enviar.mock.calls[1][0].contenido).toBe("Invitacion normal");
  } finally {
    spy.mockRestore();
  }
});
