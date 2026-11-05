import nodemailer from "nodemailer";
import twilio from "twilio";

import { InMemoryColectivoRepository } from "./repositories/InMemoryColectivoRepository.js";
import { InMemoryHabilidadRepository } from "./repositories/InMemoryHabilidadRepository.js";
import { MongoHabilidadRepository } from "./repositories/MongoHabilidadRepository.js";
import { MongoColaboradorRepository } from "./repositories/MongoColaboradorRepository.js";
import { MongoColectivoRepository } from "./repositories/MongoColectivoRepository.js";
import { MongoNotificacionRepository } from "./repositories/MongoNotificacionRepository.js";
import { InMemoryNotificacionRepository } from "./repositories/InMemoryNotificacionRepository.js";
import { InMemoryColaboradorRepository } from "./repositories/InMemoryColaboradorRepository.js";
import { MongoEstadisticaRepository } from "./repositories/MongoEstadisticaRepository.js";
import { InMemoryEstadisticaRepository } from "./repositories/InMemoryEstadisticaRepository.js";

import { CanalEmail } from "./canales/CanalEmail.js";
import { CanalWhatsApp } from "./canales/CanalWhatsApp.js";
import { CanalSimulado } from "./canales/CanalSimulado.js";
import { CanalEnMemoria } from "./canales/CanalEnMemoria.js";

import { ColectivoService } from "./services/ColectivoService.js";
import { ProyectoService } from "./services/ProyectoService.js";
import { PerfilService } from "./services/PerfilService.js";
import { HabilidadService } from "./services/HabilidadService.js";
import { ColaboradorService } from "./services/ColaboradorService.js";
import { ColaboracionService } from "./services/ColaboracionService.js";
import { NotificacionService } from "./services/NotificacionService.js";
import { ReclutamientoService } from "./services/ReclutamientoService.js";
import { AvisoAutomaticoService } from "./services/AvisoAutomaticoService.js";
import { EstadisticaService } from "./services/EstadisticaService.js";
import { LogroService } from "./services/LogroService.js";
import { AvanceService } from "./services/AvanceService.js";

import { ColectivoController } from "./controllers/ColectivoController.js";
import { ProyectoController } from "./controllers/ProyectoController.js";
import { PerfilController } from "./controllers/PerfilController.js";
import { HabilidadController } from "./controllers/HabilidadController.js";
import { ColaboradorController } from "./controllers/ColaboradorController.js";
import { NotificacionController } from "./controllers/NotificacionController.js";
import { ReclutamientoController } from "./controllers/ReclutamientoController.js";
import { PostulacionController } from "./controllers/PostulacionController.js";
import { EstadisticaController } from "./controllers/EstadisticaController.js";
import { LogroController } from "./controllers/LogroController.js";
import { AvanceController } from "./controllers/AvanceController.js";

export function crearRepositoriosMongo() {
  return {
    habilidadRepository: new MongoHabilidadRepository(),
    colaboradorRepository: new MongoColaboradorRepository(),
    colectivoRepository: new MongoColectivoRepository(),
    notificacionRepository: new MongoNotificacionRepository(),
    estadisticaRepository: new MongoEstadisticaRepository(),
  };
}

export function crearRepositoriosEnMemoria() {
  const colaboradorRepository = new InMemoryColaboradorRepository();
  const colectivoRepository = new InMemoryColectivoRepository();

  return {
    habilidadRepository: new InMemoryHabilidadRepository(),
    colaboradorRepository,
    colectivoRepository,
    notificacionRepository: new InMemoryNotificacionRepository(),
    estadisticaRepository: new InMemoryEstadisticaRepository({
      colectivoRepository,
      colaboradorRepository,
    }),
  };
}

export function crearCanales(entorno = process.env) {
  const email = entorno.SMTP_URL
    ? new CanalEmail({
        transporte: nodemailer.createTransport(entorno.SMTP_URL),
        remitente: entorno.SMTP_REMITENTE || "Codigo a Voluntad <no-responder@localhost>",
      })
    : new CanalSimulado("EMAIL");

  const whatsapp =
    entorno.TWILIO_ACCOUNT_SID && entorno.TWILIO_AUTH_TOKEN
      ? new CanalWhatsApp({
          cliente: twilio(entorno.TWILIO_ACCOUNT_SID, entorno.TWILIO_AUTH_TOKEN),
          remitente: entorno.TWILIO_WHATSAPP_REMITENTE || "whatsapp:+14155238886",
        })
      : new CanalSimulado("WHATSAPP");

  return { EMAIL: email, WHATSAPP: whatsapp, SMS: new CanalSimulado("SMS") };
}

export function crearCanalesEnMemoria() {
  return {
    EMAIL: new CanalEnMemoria(),
    WHATSAPP: new CanalEnMemoria(),
    SMS: new CanalEnMemoria(),
  };
}

export function componerApp({
  repositorios = crearRepositoriosMongo(),
  canales = crearCanales(),
} = {}) {
  const {
    habilidadRepository,
    colaboradorRepository,
    colectivoRepository,
    notificacionRepository,
    estadisticaRepository,
  } = repositorios;

  const habilidadService = new HabilidadService({ habilidadRepository });

  const notificacionService = new NotificacionService({
    notificacionRepository,
    colaboradorRepository,
    canales,
  });

  const perfilService = new PerfilService({
    colectivoRepository,
    habilidadService,
    notificacionService,
  });

  const avisoAutomaticoService = new AvisoAutomaticoService({
    colaboradorRepository,
    colectivoRepository,
    notificacionService,
  });

  const colaboradorService = new ColaboradorService({
    colaboradorRepository,
    habilidadService,
    avisoAutomaticoService,
  });

  const colectivoService = new ColectivoService({
    colectivoRepository,
    notificacionService,
  });

  const proyectoService = new ProyectoService({
    colectivoRepository,
    colectivoService,
    perfilService,
    notificacionService,
    avisoAutomaticoService,
  });

  const reclutamientoService = new ReclutamientoService({
    colaboradorRepository,
    colectivoRepository,
    colaboradorService,
    perfilService,
    notificacionService,
  });

  const colaboracionService = new ColaboracionService({
    colectivoRepository,
    colectivoService,
    proyectoService,
    colaboradorService,
    notificacionService,
  });

  const estadisticaService = new EstadisticaService({
    estadisticaRepository,
    colectivoService,
  });

  const logroService = new LogroService({ colectivoRepository });

  const avanceService = new AvanceService({ colectivoRepository });

  const controllers = {
    colectivo: new ColectivoController({
      colectivoService,
      proyectoService,
      colaboracionService,
    }),
    proyecto: new ProyectoController({ proyectoService, colaboracionService }),
    perfil: new PerfilController({ perfilService }),
    habilidad: new HabilidadController({ habilidadService }),
    colaborador: new ColaboradorController({ colaboradorService, colaboracionService }),
    notificacion: new NotificacionController({ notificacionService }),
    reclutamiento: new ReclutamientoController({ reclutamientoService }),
    postulacion: new PostulacionController({ colaboracionService }),
    estadistica: new EstadisticaController({ estadisticaService }),
    logro: new LogroController({ logroService }),
    avance: new AvanceController({ avanceService }),
  };

  const services = {
    colectivoService,
    proyectoService,
    perfilService,
    habilidadService,
    colaboradorService,
    colaboracionService,
    notificacionService,
    reclutamientoService,
    avisoAutomaticoService,
    estadisticaService,
    logroService,
    avanceService,
  };

  return { controllers, services };
}
