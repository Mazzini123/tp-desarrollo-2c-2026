import { jest } from "@jest/globals";
import { CanalSMS } from "../../src/canales/CanalSMS.js";
import { CanalEmail } from "../../src/canales/CanalEmail.js";
import { CanalSimulado } from "../../src/canales/CanalSimulado.js";
import { CanalWhatsApp } from "../../src/canales/CanalWhatsApp.js";
import { crearCanales } from "../../src/composicion.js";
import {
  medioDeContactoSchema,
  medioDeContactoEnRutaSchema,
} from "../../src/schemas/medioDeContactoSchema.js";

const mensaje = {
  destino: "+5491155551234",
  asunto: "Invitación",
  contenido: "Te invitan a un proyecto",
};
const credenciales = {
  TWILIO_ACCOUNT_SID: `AC${"0".repeat(32)}`,
  TWILIO_AUTH_TOKEN: "token-de-prueba",
};

test("SMS envia el contenido al destino con su propio remitente", async () => {
  const create = jest.fn().mockResolvedValue({ sid: "SMprueba" });
  const canal = new CanalSMS({
    cliente: { messages: { create } },
    remitente: "+12345678910",
  });
  await canal.enviar(mensaje);
  expect(create).toHaveBeenCalledWith({
    to: mensaje.destino,
    from: "+12345678910",
    body: mensaje.contenido,
  });
});

test.each([
  "1155551234",
  "+0123456789",
  "+1234567",
  "+1234567890123456",
  "whatsapp:+5491155551234",
])("SMS rechaza destino invalido %s sin llamar al proveedor", async (destino) => {
  const create = jest.fn();
  const canal = new CanalSMS({
    cliente: { messages: { create } },
    remitente: "+12345678910",
  });
  await expect(canal.enviar({ ...mensaje, destino })).rejects.toThrow(
    "formato internacional",
  );
  expect(create).not.toHaveBeenCalled();
});

test("SMS propaga errores del proveedor", async () => {
  const create = jest.fn().mockRejectedValue(new Error("Proveedor caido"));
  const canal = new CanalSMS({
    cliente: { messages: { create } },
    remitente: "+12345678910",
  });
  await expect(canal.enviar(mensaje)).rejects.toThrow("Proveedor caido");
});

test("email manda texto y asunto y espera aceptacion SMTP", async () => {
  const sendMail = jest
    .fn()
    .mockResolvedValue({ accepted: ["ada@example.org"], rejected: [] });
  const canal = new CanalEmail({
    transporte: { sendMail },
    remitente: "avisos@example.org",
  });
  await canal.enviar({ ...mensaje, destino: "ada@example.org" });
  expect(sendMail).toHaveBeenCalledWith({
    from: "avisos@example.org",
    to: "ada@example.org",
    subject: mensaje.asunto,
    text: mensaje.contenido,
  });
});

test.each([{ accepted: [], rejected: ["ada@example.org"] }, { accepted: [] }, {}])(
  "email rechaza respuesta sin aceptacion %j",
  async (resultado) => {
    const canal = new CanalEmail({
      transporte: { sendMail: async () => resultado },
      remitente: "avisos@example.org",
    });
    await expect(
      canal.enviar({ ...mensaje, destino: "ada@example.org" }),
    ).rejects.toThrow("no acepto");
  },
);

test("email propaga errores SMTP", async () => {
  const canal = new CanalEmail({
    transporte: {
      sendMail: async () => {
        throw new Error("SMTP caido");
      },
    },
    remitente: "avisos@example.org",
  });
  await expect(canal.enviar(mensaje)).rejects.toThrow("SMTP caido");
});

test("sin configuracion todos los canales se simulan", () => {
  for (const canal of Object.values(crearCanales({})))
    expect(canal).toBeInstanceOf(CanalSimulado);
});

test("SMS sin remitente se simula aunque WhatsApp tenga credenciales", () => {
  const canales = crearCanales({
    ...credenciales,
    TWILIO_WHATSAPP_REMITENTE: "whatsapp:+12345678910",
  });
  expect(canales.SMS).toBeInstanceOf(CanalSimulado);
  expect(canales.WHATSAPP).toBeInstanceOf(CanalWhatsApp);
  expect(canales.EMAIL).toBeInstanceOf(CanalSimulado);
});

test("configurar solo SMS no activa WhatsApp ni email", () => {
  const canales = crearCanales({ ...credenciales, TWILIO_SMS_REMITENTE: "+12345678910" });
  expect(canales.SMS).toBeInstanceOf(CanalSMS);
  expect(canales.WHATSAPP).toBeInstanceOf(CanalSimulado);
  expect(canales.EMAIL).toBeInstanceOf(CanalSimulado);
});

test("configuracion completa selecciona SMTP y SMS reales con remitentes independientes", () => {
  const canales = crearCanales({
    ...credenciales,
    TWILIO_SMS_REMITENTE: "+12345678910",
    TWILIO_WHATSAPP_REMITENTE: "whatsapp:+12345678911",
    SMTP_URL: "smtp://localhost:1025",
    SMTP_REMITENTE: "avisos@example.org",
  });
  expect(canales.SMS).toBeInstanceOf(CanalSMS);
  expect(canales.SMS.remitente).toBe("+12345678910");
  expect(canales.WHATSAPP.remitente).toBe("whatsapp:+12345678911");
  expect(canales.EMAIL).toBeInstanceOf(CanalEmail);
  expect(canales.EMAIL.remitente).toBe("avisos@example.org");
});

test.each([
  {},
  { TWILIO_ACCOUNT_SID: credenciales.TWILIO_ACCOUNT_SID },
  { TWILIO_AUTH_TOKEN: credenciales.TWILIO_AUTH_TOKEN },
])("remitente SMS sin ambas credenciales impide arrancar %j", (parcial) => {
  expect(() =>
    crearCanales({ ...parcial, TWILIO_SMS_REMITENTE: "+12345678910" }),
  ).toThrow("requiere TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN");
});

test("SMS normaliza espacios y guiones antes de validar", () => {
  expect(
    medioDeContactoSchema.parse({ tipo: "SMS", valor: " +54 9 11-5555-1234 " }),
  ).toEqual({ tipo: "SMS", valor: mensaje.destino });
});

test("el alta rechaza SMS locales pero la baja permite contactos antiguos", () => {
  const antiguo = { tipo: "SMS", valor: "11 5555-1234" };
  expect(medioDeContactoSchema.safeParse(antiguo).success).toBe(false);
  expect(medioDeContactoEnRutaSchema.parse(antiguo)).toEqual({
    tipo: "SMS",
    valor: "1155551234",
  });
});
