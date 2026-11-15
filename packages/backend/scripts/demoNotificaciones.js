import fs from "node:fs";
import { parseArgs } from "node:util";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server-core";
import { componerApp } from "../src/composicion.js";
import { crearCanalesDemo } from "./canalesDemo.js";
import { CanalSimulado } from "../src/canales/CanalSimulado.js";
import { medioDeContactoSchema } from "../src/schemas/medioDeContactoSchema.js";
import { asegurarIndices } from "../src/config/db.js";
import { cargarHabilidadesIniciales } from "../src/seed/habilidadesSeed.js";

async function main() {
  const { values: opciones } = parseArgs({
    options: {
      enviar: { type: "boolean", default: false },
      email: { type: "string" },
      sms: { type: "string" },
      help: { type: "boolean", default: false },
    },
  });
  if (opciones.help) {
    console.log(`Demo aislada de notificaciones:
  npm run demo:notificaciones
  npm run demo:notificaciones -- --enviar
  npm run demo:notificaciones -- --enviar --email persona@example.org
  npm run demo:notificaciones -- --enviar --email persona@example.org --sms +5491155551234

Sin --enviar se simulan ambos canales. Con --enviar se manda una invitacion
real solo a los destinos indicados; SMS requiere un destinatario habilitado
por Twilio. Sin destinos en la linea de comandos usa DEMO_EMAIL_DESTINO y
DEMO_SMS_DESTINO del .env local. No usa MONGO_URI ni modifica la API productiva.
DEMO_SMS_PLANTILLA permite usar una plantilla predefinida de Twilio Trial,
por ejemplo sms_event_notifications, solo para el SMS de esta demo.
Requiere las dependencias de desarrollo y MongoDB temporal (se descarga la
primera vez). Los datos se eliminan al terminar; no hay reintentos automaticos.`);
    return;
  }

  const archivo = new URL("../.env", import.meta.url);
  const entorno = {
    ...(fs.existsSync(archivo) ? dotenv.parse(fs.readFileSync(archivo)) : {}),
    ...process.env,
  };
  if (entorno.NODE_ENV === "production") {
    throw new Error("La demo solo se ejecuta fuera de NODE_ENV=production");
  }
  if (!opciones.email && !opciones.sms) {
    opciones.email = entorno.DEMO_EMAIL_DESTINO;
    opciones.sms = entorno.DEMO_SMS_DESTINO;
  }
  if (opciones.enviar && !opciones.email && !opciones.sms) {
    throw new Error("Indica --email y/o --sms para elegir los destinatarios reales");
  }
  const medios = [];
  if (opciones.email || !opciones.enviar) {
    medios.push(
      medioDeContactoSchema.parse({
        tipo: "EMAIL",
        valor: opciones.email || "demo@example.org",
      }),
    );
  }
  if (opciones.sms || !opciones.enviar) {
    medios.push(
      medioDeContactoSchema.parse({
        tipo: "SMS",
        valor: opciones.sms || "+5491155551234",
      }),
    );
  }
  if (opciones.enviar && opciones.email && !entorno.SMTP_URL) {
    throw new Error("Falta SMTP_URL para enviar email real");
  }
  if (
    opciones.enviar &&
    opciones.sms &&
    (!entorno.TWILIO_SMS_REMITENTE ||
      !entorno.TWILIO_ACCOUNT_SID ||
      !entorno.TWILIO_AUTH_TOKEN)
  ) {
    throw new Error("Faltan las credenciales o el remitente SMS de Twilio");
  }

  const canales = opciones.enviar
    ? crearCanalesDemo(entorno)
    : { EMAIL: new CanalSimulado("EMAIL"), SMS: new CanalSimulado("SMS") };
  let mongo;
  try {
    console.log(
      opciones.enviar
        ? "DEMO CON ENVIOS REALES a los destinos indicados."
        : "DEMO SIMULADA: no envia email ni SMS reales.",
    );
    console.log("Preparando una base temporal independiente. MONGO_URI no se utiliza.");
    if (opciones.enviar && opciones.sms && entorno.DEMO_SMS_PLANTILLA) {
      console.log(
        `SMS Trial: se enviara la plantilla ${entorno.DEMO_SMS_PLANTILLA}, no el texto de la invitacion. La API productiva no usa este ajuste.`,
      );
    }
    // Nunca conectar a una URI de entorno: cada ejecucion obtiene su propio
    // replica set y almacenamiento temporal, incluso si hay una API levantada.
    mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(mongo.getUri("cav-demo-notificaciones"));
    await asegurarIndices();
    const { services } = componerApp({ canales });
    await cargarHabilidadesIniciales(services.habilidadService);
    const colectivo = await services.colectivoService.crear({
      nombre: "Colectivo de demostracion",
      descripcion: "Ejemplo temporal para el TP",
      tipoColectivo: "ONG",
    });
    const colaborador = await services.colaboradorService.crear(
      {
        cuentaGit: "colaborador-demo",
        recibeMensajeriaInterna: true,
        mediosDeContacto: medios,
        codigosHabilidades: ["desarrollo_node"],
      },
      { avisar: false },
    );
    const proyecto = await services.proyectoService.crear({
      colectivoId: colectivo.id,
      titulo: "Integracion de notificaciones del TP",
      descripcion: "Proyecto temporal para demostrar una invitacion real",
      perfiles: [
        {
          descripcion: "Desarrollo Node",
          compromiso: { cantidadHoras: 5, periodo: "HS_MENSUALES" },
          modalidadColaboracion: "GRATUITA",
          codigosHabilidadesRequeridas: ["desarrollo_node"],
        },
      ],
    });
    const notificacion = await services.reclutamientoService.invitar(
      proyecto.id,
      proyecto.perfiles[0].id,
      {
        colaboradorId: colaborador.id,
        mensaje: "Esta es la demostracion de SMS y email de Codigo a Voluntad.",
      },
    );
    const mostrar = async () => {
      const pagina = await services.notificacionService.listar(colaborador.id);
      const mensaje = pagina.items.find((item) => item.id === notificacion.id);
      console.table(mensaje.toJSON().envios);
      return mensaje.envios;
    };
    console.log("1. Invitacion guardada: notificacion interna y copias PENDIENTE.");
    await mostrar();
    console.log("2. Procesando la cola con el mismo servicio que usa el job de la API.");
    await services.notificacionService.procesarEnviosPendientes();
    const envios = await mostrar();
    const esperado = opciones.enviar ? "ENVIADO" : "SIMULADO";
    if (envios.some((envio) => envio.estado !== esperado)) {
      console.error(
        "Un proveedor no acepto el envio. Revisa el evento envio_fallido anterior.",
      );
      console.error(
        "Esta demo hace un solo intento por canal y elimina su base al terminar.",
      );
      process.exitCode = 1;
    } else {
      console.log(
        opciones.enviar
          ? "El proveedor acepto los mensajes. Revisa el correo/celular; ENVIADO no confirma recepcion final."
          : "Flujo completo verificado sin mensajes reales. Usa --enviar y los destinos para mostrar la entrega.",
      );
    }
  } finally {
    for (const canal of Object.values(canales)) canal.transporte?.close();
    try {
      await mongoose.disconnect();
    } finally {
      await mongo?.stop();
    }
  }
}

main().catch((error) => {
  console.error(`No se pudo completar la demo: ${error.message}`);
  process.exitCode = 1;
});
