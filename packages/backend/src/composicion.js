import { MongoAvisoRepository } from "./repositories/MongoAvisoRepository.js";
import { ValoracionService } from "./services/ValoracionService.js";
import { TimelineService } from "./services/TimelineService.js";
import nodemailer from "nodemailer";
import twilio from "twilio";

import { MongoHabilidadRepository } from "./repositories/MongoHabilidadRepository.js";
import { MongoColaboradorRepository } from "./repositories/MongoColaboradorRepository.js";
import { MongoColectivoRepository } from "./repositories/MongoColectivoRepository.js";
import { MongoProyectoRepository } from "./repositories/MongoProyectoRepository.js";
import { MongoAuditoriaRepository } from "./repositories/MongoAuditoriaRepository.js";
import { MongoRevisionRepository } from "./repositories/MongoRevisionRepository.js";
import { MongoColaboracionRepository } from "./repositories/MongoColaboracionRepository.js";
import { MongoNotificacionRepository } from "./repositories/MongoNotificacionRepository.js";
import { MongoEstadisticaRepository } from "./repositories/MongoEstadisticaRepository.js";

import { MongoUsuarioRepository } from "./security/persistencia/MongoUsuarioRepository.js";
import { MongoIdentidadExternaRepository } from "./security/persistencia/MongoIdentidadExternaRepository.js";
import { MongoContextoUsuarioRepository } from "./security/persistencia/MongoContextoUsuarioRepository.js";
import { MongoSolicitudIngresoRepository } from "./security/persistencia/MongoSolicitudIngresoRepository.js";
import { MongoCatalogoRepository } from "./security/persistencia/MongoCatalogoRepository.js";
import { transaccionesMongo } from "./config/transacciones.js";

import { CatalogoDeRoles } from "./security/autorizacion/CatalogoDeRoles.js";
import { RegistroService } from "./security/application/RegistroService.js";
import { ContextoService } from "./security/application/ContextoService.js";
import { AdministradorService } from "./security/application/AdministradorService.js";
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
import { AuditoriaService } from "./services/AuditoriaService.js";
import { ConflictoDeInteresesService } from "./services/ConflictoDeInteresesService.js";
import { DestacadoService } from "./services/DestacadoService.js";
import { RevisionService } from "./services/RevisionService.js";

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
import { AdministracionController } from "./controllers/AdministracionController.js";
import { TerminosController } from "./controllers/TerminosController.js";
import { TerminosService } from "./services/TerminosService.js";
import { BajaPorInfraccionService } from "./services/BajaPorInfraccionService.js";
import { MongoTerminosRepository } from "./repositories/MongoTerminosRepository.js";

export function crearRepositoriosMongo() {
  const catalogoRepository = new MongoCatalogoRepository();
  return {
    catalogoRepository,
    avisoRepository: new MongoAvisoRepository(),
    habilidadRepository: new MongoHabilidadRepository(),
    colaboradorRepository: new MongoColaboradorRepository(),
    colectivoRepository: new MongoColectivoRepository(),
    proyectoRepository: new MongoProyectoRepository(),
    colaboracionRepository: new MongoColaboracionRepository(),
    notificacionRepository: new MongoNotificacionRepository(),
    estadisticaRepository: new MongoEstadisticaRepository(),
    usuarioRepository: new MongoUsuarioRepository(),
    identidadExternaRepository: new MongoIdentidadExternaRepository({
      catalogoRepository,
    }),
    contextoUsuarioRepository: new MongoContextoUsuarioRepository({ catalogoRepository }),
    solicitudIngresoRepository: new MongoSolicitudIngresoRepository(),
    auditoriaRepository: new MongoAuditoriaRepository(),
    revisionRepository: new MongoRevisionRepository(),
    terminosRepository: new MongoTerminosRepository(),
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
  configuracionAdministracion = {},
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
    auditoriaRepository,
    revisionRepository,
    terminosRepository = new MongoTerminosRepository(),
    transacciones,
  } = repositorios;
  const { diasSinActualizaciones = 30, maxDestacadosActivos = 6 } =
    configuracionAdministracion;

  const habilidadService = new HabilidadService({ habilidadRepository });

  const notificacionService = new NotificacionService({
    notificacionRepository,
    colaboradorRepository,
    canales,
  });

  // La auditoria se arma antes porque la usan los terminos, y estos el alta de proyectos.
  const auditoriaService = new AuditoriaService({ auditoriaRepository });
  const terminosService = new TerminosService({
    terminosRepository,
    auditoriaService,
    transacciones,
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
    revisionRepository,
    terminosService,
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
    contextoUsuarioRepository,
    usuarioRepository,
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

  const conflictoDeIntereses = new ConflictoDeInteresesService({
    contextoUsuarioRepository,
  });
  const administradorService = new AdministradorService({
    transacciones,
    contextoUsuarioRepository,
    usuarioRepository,
    auditoriaService,
  });
  const destacadoService = new DestacadoService({
    transacciones,
    proyectoRepository,
    colectivoRepository,
    auditoriaService,
    conflictoDeIntereses,
    maxDestacadosActivos,
  });
  const revisionService = new RevisionService({
    transacciones,
    revisionRepository,
    proyectoRepository,
    colaboracionRepository,
    auditoriaService,
    conflictoDeIntereses,
    diasSinActualizaciones,
    avisoAutomaticoService,
  });

  const modalidadService = new ModalidadService({
    transacciones,
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

  const bajaPorInfraccionService = new BajaPorInfraccionService({
    transacciones,
    proyectoRepository,
    revisionRepository,
    colectivoService,
    membresiaService,
    notificacionService,
    auditoriaService,
    conflictoDeIntereses,
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
    administracion: new AdministracionController({
      auditoriaService,
      revisionService,
      destacadoService,
      administradorService,
      terminosService,
      bajaPorInfraccionService,
    }),
    terminos: new TerminosController({ terminosService }),
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
    administradorService,
    auditoriaService,
    destacadoService,
    revisionService,
    terminosService,
    bajaPorInfraccionService,
    modalidadService,
    membresiaService,
    liderazgoService,
  };

  return { controllers, services, autorizacion };
}
