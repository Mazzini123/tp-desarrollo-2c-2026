import { MongoAvisoRepository } from "./repositories/MongoAvisoRepository.js";
import { ValoracionService } from "./services/ValoracionService.js";
import { TimelineService } from "./services/TimelineService.js";
import nodemailer from "nodemailer";
import twilio from "twilio";

import { MongoHabilidadRepository } from "./repositories/MongoHabilidadRepository.js";
import { MongoColaboradorRepository } from "./repositories/MongoColaboradorRepository.js";
import { MongoColectivoRepository } from "./repositories/MongoColectivoRepository.js";
import { MongoProyectoRepository } from "./repositories/MongoProyectoRepository.js";
import { MongoColaboracionRepository } from "./repositories/MongoColaboracionRepository.js";
import { MongoNotificacionRepository } from "./repositories/MongoNotificacionRepository.js";
import { MongoEstadisticaRepository } from "./repositories/MongoEstadisticaRepository.js";

import { MongoUsuarioRepository } from "./security/persistencia/MongoUsuarioRepository.js";
import { MongoIdentidadExternaRepository } from "./security/persistencia/MongoIdentidadExternaRepository.js";
import { MongoContextoUsuarioRepository } from "./security/persistencia/MongoContextoUsuarioRepository.js";
import { MongoSolicitudIngresoRepository } from "./security/persistencia/MongoSolicitudIngresoRepository.js";
import { transaccionesMongo } from "./config/transacciones.js";

import { CatalogoDeRoles } from "./security/autorizacion/CatalogoDeRoles.js";
import { RegistroService } from "./security/application/RegistroService.js";
import { ContextoService } from "./security/application/ContextoService.js";
import { ModalidadService } from "./services/ModalidadService.js";
import { MembresiaService } from "./services/MembresiaService.js";
import { LiderazgoService } from "./security/application/LiderazgoService.js";
import { CuentaController } from "./controllers/CuentaController.js";
import { MembresiaController } from "./controllers/MembresiaController.js";
import { crearAutorizacion } from "./middlewares/autorizacion.js";
import { CanalEmail } from "./canales/CanalEmail.js";
import { CanalSMS } from "./canales/CanalSMS.js";
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
    avisoRepository: new MongoAvisoRepository(),
    habilidadRepository: new MongoHabilidadRepository(),
    colaboradorRepository: new MongoColaboradorRepository(),
    colectivoRepository: new MongoColectivoRepository(),
    proyectoRepository: new MongoProyectoRepository(),
    colaboracionRepository: new MongoColaboracionRepository(),
    notificacionRepository: new MongoNotificacionRepository(),
    estadisticaRepository: new MongoEstadisticaRepository(),
    usuarioRepository: new MongoUsuarioRepository(),
    identidadExternaRepository: new MongoIdentidadExternaRepository(),
    contextoUsuarioRepository: new MongoContextoUsuarioRepository(),
    solicitudIngresoRepository: new MongoSolicitudIngresoRepository(),
    transacciones: transaccionesMongo,
  };
}

export function crearCanales(entorno = process.env) {
  if (
    entorno.TWILIO_SMS_REMITENTE &&
    (!entorno.TWILIO_ACCOUNT_SID || !entorno.TWILIO_AUTH_TOKEN)
  ) {
    throw new Error(
      "TWILIO_SMS_REMITENTE requiere TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN",
    );
  }
  const email = entorno.SMTP_URL
    ? new CanalEmail({
        transporte: nodemailer.createTransport(entorno.SMTP_URL),
        remitente: entorno.SMTP_REMITENTE || "Codigo a Voluntad <no-responder@localhost>",
      })
    : new CanalSimulado("EMAIL");

  const whatsapp =
    entorno.TWILIO_ACCOUNT_SID &&
    entorno.TWILIO_AUTH_TOKEN &&
    entorno.TWILIO_WHATSAPP_REMITENTE
      ? new CanalWhatsApp({
          cliente: twilio(entorno.TWILIO_ACCOUNT_SID, entorno.TWILIO_AUTH_TOKEN),
          remitente: entorno.TWILIO_WHATSAPP_REMITENTE,
        })
      : new CanalSimulado("WHATSAPP");

  const sms = entorno.TWILIO_SMS_REMITENTE
    ? new CanalSMS({
        cliente: twilio(entorno.TWILIO_ACCOUNT_SID, entorno.TWILIO_AUTH_TOKEN),
        remitente: entorno.TWILIO_SMS_REMITENTE,
      })
    : new CanalSimulado("SMS");

  return { EMAIL: email, WHATSAPP: whatsapp, SMS: sms };
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
  autenticador = null,
  catalogoDeRoles = new CatalogoDeRoles(),
  compatContextoImplicito = false,
  avisarContextoImplicito,
} = {}) {
  const {
    avisoRepository,
    habilidadRepository,
    colaboradorRepository,
    colectivoRepository,
    proyectoRepository,
    colaboracionRepository,
    notificacionRepository,
    estadisticaRepository,
    usuarioRepository,
    identidadExternaRepository,
    contextoUsuarioRepository,
    solicitudIngresoRepository,
    transacciones,
  } = repositorios;

  const habilidadService = new HabilidadService({ habilidadRepository });

  const notificacionService = new NotificacionService({
    notificacionRepository,
    colaboradorRepository,
    canales,
  });

  const perfilService = new PerfilService({
    transacciones,
    proyectoRepository,
    habilidadService,
    notificacionService,
  });

  const avisoAutomaticoService = new AvisoAutomaticoService({
    avisoRepository,
    colaboradorRepository,
    proyectoRepository,
    notificacionService,
  });

  const colaboradorService = new ColaboradorService({
    transacciones,
    colaboradorRepository,
    habilidadService,
    avisoAutomaticoService,
  });

  const colectivoService = new ColectivoService({
    transacciones,
    colectivoRepository,
    proyectoRepository,
    notificacionService,
  });

  const proyectoService = new ProyectoService({
    colaboracionRepository,
    transacciones,
    proyectoRepository,
    colectivoService,
    perfilService,
    notificacionService,
    avisoAutomaticoService,
  });

  const reclutamientoService = new ReclutamientoService({
    colaboradorRepository,
    proyectoRepository,
    colaboradorService,
    perfilService,
    notificacionService,
  });

  const colaboracionService = new ColaboracionService({
    transacciones,
    proyectoRepository,
    colaboracionRepository,
    colectivoService,
    proyectoService,
    colaboradorService,
    notificacionService,
  });

  const valoracionService = new ValoracionService({
    colaboracionService,
    colaboracionRepository,
    proyectoRepository,
    colectivoService,
    colaboradorService,
  });
  const timelineService = new TimelineService({
    colectivoService,
    proyectoRepository,
    colaboracionRepository,
  });

  const estadisticaService = new EstadisticaService({
    estadisticaRepository,
    colectivoService,
  });

  const logroService = new LogroService({ proyectoRepository });

  const avanceService = new AvanceService({ proyectoRepository });

  const registroService = new RegistroService({
    transacciones,
    identidadExternaRepository,
    usuarioRepository,
  });

  const contextoService = new ContextoService({
    transacciones,
    contextoUsuarioRepository,
    usuarioRepository,
    colectivoRepository,
    colaboradorRepository,
    catalogoDeRoles,
  });

  const modalidadService = new ModalidadService({
    transacciones,
    contextoService,
    contextoUsuarioRepository,
    usuarioRepository,
    colectivoService,
    colaboradorService,
    colaboracionService,
  });

  const membresiaService = new MembresiaService({
    transacciones,
    contextoService,
    contextoUsuarioRepository,
    solicitudIngresoRepository,
    usuarioRepository,
    colectivoService,
  });

  const liderazgoService = new LiderazgoService({
    transacciones,
    contextoService,
    contextoUsuarioRepository,
  });

  const autorizacion = crearAutorizacion({
    autenticador,
    registroService,
    contextoService,
    catalogoDeRoles,
    proyectoService,
    compatContextoImplicito,
    avisarContextoImplicito,
  });

  const controllers = {
    cuenta: new CuentaController({ registroService, contextoService, membresiaService }),
    membresia: new MembresiaController({ membresiaService, liderazgoService }),
    colectivo: new ColectivoController({
      timelineService,
      valoracionService,
      colectivoService,
      proyectoService,
      colaboracionService,
      modalidadService,
      membresiaService,
    }),
    proyecto: new ProyectoController({ proyectoService, colaboracionService }),
    perfil: new PerfilController({ perfilService }),
    habilidad: new HabilidadController({ habilidadService }),
    colaborador: new ColaboradorController({
      valoracionService,
      colaboradorService,
      colaboracionService,
      modalidadService,
    }),
    notificacion: new NotificacionController({ notificacionService }),
    reclutamiento: new ReclutamientoController({ reclutamientoService }),
    postulacion: new PostulacionController({ colaboracionService, valoracionService }),
    estadistica: new EstadisticaController({ estadisticaService }),
    logro: new LogroController({ logroService }),
    avance: new AvanceController({ avanceService }),
  };

  const services = {
    valoracionService,
    timelineService,
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
    registroService,
    contextoService,
    modalidadService,
    membresiaService,
    liderazgoService,
  };

  return { controllers, services, autorizacion };
}
