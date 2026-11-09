import { Router } from "express";
import { validarBody, validarQuery } from "../middlewares/validar.js";
import { paginacionSchema, listadoDeNotificacionesSchema } from "../schemas/paginacionSchema.js";
import {
  crearColaboradorSchema,
  actualizarColaboradorSchema,
  agregarPronombreSchema,
  agregarHabilidadColaboradorSchema,
} from "../schemas/colaboradorSchema.js";
import { medioDeContactoSchema } from "../schemas/medioDeContactoSchema.js";

export function crearColaboradoresRouter(
  colaboradorController,
  notificacionController,
  reclutamientoController,
  autorizacion,
) {
  const router = Router();

  router.post(
    "/",
    validarBody(crearColaboradorSchema),
    autorizacion.sinPerfil,
    colaboradorController.crear,
  );
  router.get("/", validarQuery(paginacionSchema), colaboradorController.listar);
  router.get("/:id", colaboradorController.obtenerPorId);
  router.put(
    "/:id",
    autorizacion.colaboradoraDe(),
    validarBody(actualizarColaboradorSchema),
    colaboradorController.actualizar,
  );

  router.post(
    "/:id/pronombres",
    autorizacion.colaboradoraDe(),
    validarBody(agregarPronombreSchema),
    colaboradorController.agregarPronombre,
  );
  router.delete(
    "/:id/pronombres/:pronombre",
    autorizacion.colaboradoraDe(),
    colaboradorController.quitarPronombre,
  );

  router.post(
    "/:id/habilidades",
    autorizacion.colaboradoraDe(),
    validarBody(agregarHabilidadColaboradorSchema),
    colaboradorController.agregarHabilidad,
  );
  router.delete(
    "/:id/habilidades/:codigoHabilidad",
    autorizacion.colaboradoraDe(),
    colaboradorController.quitarHabilidad,
  );

  // Los medios de contacto solo los lee la propia persona (con la autenticacion activa).
  if (autorizacion.activa) {
    router.get(
      "/:id/medios-de-contacto",
      autorizacion.colaboradoraDe(),
      colaboradorController.mediosDeContacto,
    );
  }

  router.post(
    "/:id/medios-de-contacto",
    autorizacion.colaboradoraDe(),
    validarBody(medioDeContactoSchema),
    colaboradorController.agregarMedioDeContacto,
  );
  router.delete(
    "/:id/medios-de-contacto/:tipo/:valor",
    autorizacion.colaboradoraDe(),
    colaboradorController.quitarMedioDeContacto,
  );

  router.get("/:id/colaboraciones", colaboradorController.listarColaboraciones);
  router.get("/:id/valoraciones", colaboradorController.listarValoraciones);

  // Busqueda de potenciales proyectos para la persona colaboradora (req. 3.d).
  router.get(
    "/:id/proyectos-potenciales",
    autorizacion.colaboradoraDe(),
    validarQuery(paginacionSchema),
    reclutamientoController.buscarProyectos,
  );

  // La bandeja de mensajes internos de la persona.
  router.get(
    "/:id/notificaciones",
    autorizacion.colaboradoraDe(),
    validarQuery(listadoDeNotificacionesSchema),
    notificacionController.listar,
  );
  router.post(
    "/:id/notificaciones/:notificacionId/lectura",
    autorizacion.colaboradoraDe(),
    notificacionController.marcarComoLeida,
  );

  return router;
}
