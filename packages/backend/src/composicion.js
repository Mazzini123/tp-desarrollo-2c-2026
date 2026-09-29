import nodemailer from "nodemailer";

import { InMemoryRepository } from "./repositories/InMemoryRepository.js";
import { InMemoryColectivoRepository } from "./repositories/InMemoryColectivoRepository.js";
import { InMemoryHabilidadRepository } from "./repositories/InMemoryHabilidadRepository.js";
import { MongoHabilidadRepository } from "./repositories/MongoHabilidadRepository.js";
import { MongoColaboradorRepository } from "./repositories/MongoColaboradorRepository.js";
import { MongoColectivoRepository } from "./repositories/MongoColectivoRepository.js";
import { MongoNotificacionRepository } from "./repositories/MongoNotificacionRepository.js";
import { InMemoryNotificacionRepository } from "./repositories/InMemoryNotificacionRepository.js";

import { CanalEmail } from "./canales/CanalEmail.js";
import { CanalSimulado } from "./canales/CanalSimulado.js";
import { CanalEnMemoria } from "./canales/CanalEnMemoria.js";

import { ColectivoService } from "./services/ColectivoService.js";
import { ProyectoService } from "./services/ProyectoService.js";
import { PerfilService } from "./services/PerfilService.js";
import { HabilidadService } from "./services/HabilidadService.js";
import { ColaboradorService } from "./services/ColaboradorService.js";
import { ColaboracionService } from "./services/ColaboracionService.js";
import { NotificacionService } from "./services/NotificacionService.js";

import { ColectivoController } from "./controllers/ColectivoController.js";
import { ProyectoController } from "./controllers/ProyectoController.js";
import { PerfilController } from "./controllers/PerfilController.js";
import { HabilidadController } from "./controllers/HabilidadController.js";
import { ColaboradorController } from "./controllers/ColaboradorController.js";
import { NotificacionController } from "./controllers/NotificacionController.js";

// Los repositorios de verdad: los que usa la app levantada.
export function crearRepositoriosMongo() {
  const habilidadRepository = new MongoHabilidadRepository();
  const colaboradorRepository = new MongoColaboradorRepository({ habilidadRepository });
  const colectivoRepository = new MongoColectivoRepository({
    habilidadRepository,
    colaboradorRepository,
  });

  const notificacionRepository = new MongoNotificacionRepository();

  return {
    habilidadRepository,
    colaboradorRepository,
    colectivoRepository,
    notificacionRepository,
  };
}

// Los dobles de test: permiten correr los tests de services sin una base.
export function crearRepositoriosEnMemoria() {
  return {
    habilidadRepository: new InMemoryHabilidadRepository(),
    colaboradorRepository: new InMemoryRepository(),
    colectivoRepository: new InMemoryColectivoRepository(),
    notificacionRepository: new InMemoryNotificacionRepository(),
  };
}

// Un canal por tipo de medio de contacto. El email es real si hay un servidor
// SMTP configurado (SMTP_URL); si no, y siempre para WhatsApp y SMS, se usa
// el canal simulado, que solo deja constancia en el log.
export function crearCanales(entorno = process.env) {
  const email = entorno.SMTP_URL
    ? new CanalEmail({
        transporte: nodemailer.createTransport(entorno.SMTP_URL),
        remitente: entorno.SMTP_REMITENTE || "Codigo a Voluntad <no-responder@localhost>",
      })
    : new CanalSimulado("EMAIL");

  return { EMAIL: email, WHATSAPP: new CanalSimulado("WHATSAPP"), SMS: new CanalSimulado("SMS") };
}

// Dobles de test: guardan lo que "envian" para poder revisarlo.
export function crearCanalesEnMemoria() {
  return { EMAIL: new CanalEnMemoria(), WHATSAPP: new CanalEnMemoria(), SMS: new CanalEnMemoria() };
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
  } = repositorios;

  const habilidadService = new HabilidadService({ habilidadRepository });

  const colectivoService = new ColectivoService({ colectivoRepository });

  const perfilService = new PerfilService({
    colectivoRepository,
    habilidadService,
  });

  const proyectoService = new ProyectoService({
    colectivoRepository,
    colectivoService,
    perfilService,
  });

  const colaboradorService = new ColaboradorService({
    colaboradorRepository,
    habilidadService,
  });

  const notificacionService = new NotificacionService({
    notificacionRepository,
    colaboradorService,
    canales,
  });

  const colaboracionService = new ColaboracionService({
    colectivoRepository,
    proyectoService,
    colaboradorService,
  });

  const controllers = {
    colectivo: new ColectivoController({ colectivoService, proyectoService }),
    proyecto: new ProyectoController({ proyectoService, colaboracionService }),
    perfil: new PerfilController({ perfilService }),
    habilidad: new HabilidadController({ habilidadService }),
    colaborador: new ColaboradorController({ colaboradorService, colaboracionService }),
    notificacion: new NotificacionController({ notificacionService }),
  };

  const services = {
    colectivoService,
    proyectoService,
    perfilService,
    habilidadService,
    colaboradorService,
    colaboracionService,
    notificacionService,
  };

  return { controllers, services };
}
