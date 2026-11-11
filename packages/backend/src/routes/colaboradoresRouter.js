import { Router } from "express";
import { validarIdsDeRuta } from "../middlewares/validarIds.js";
import { validarBody, validarParams, validarQuery } from "../middlewares/validar.js";
import {
  paginacionSchema,
  listadoDeNotificacionesSchema,
} from "../schemas/paginacionSchema.js";
import {
  crearColaboradorSchema,
  actualizarColaboradorSchema,
  agregarPronombreSchema,
  agregarHabilidadColaboradorSchema,
} from "../schemas/colaboradorSchema.js";
import {
  medioDeContactoEnRutaSchema,
  medioDeContactoSchema,
} from "../schemas/medioDeContactoSchema.js";
import { PERMISO } from "../security/autorizacion/enums/PERMISO.js";

export function crearColaboradoresRouter(controllers, autorizacion) {
  const {
    colaborador: colaboradorController,
    notificacion: notificacionController,
    reclutamiento: reclutamientoController,
  } = controllers;
  const router = validarIdsDeRuta(Router());
  const { permiso, colaboradoraDe } = autorizacion;
  const editarPerfil = [permiso(PERMISO.COLABORADOR_PERFIL_EDITAR), colaboradoraDe()];

  router.post(
    "/",
    validarBody(crearColaboradorSchema),
    autorizacion.usuario(),
    colaboradorController.crear,
  );
  router.get("/", validarQuery(paginacionSchema), colaboradorController.listar);
  router.get("/:id", colaboradorController.obtenerPorId);
  router.put(
    "/:id",
    editarPerfil,
    validarBody(actualizarColaboradorSchema),
    colaboradorController.actualizar,
  );

  router.post(
    "/:id/baja",
    permiso(PERMISO.COLABORADOR_BAJA),
    colaboradoraDe(),
    colaboradorController.darDeBaja,
  );

  router.post(
    "/:id/pronombres",
    editarPerfil,
    validarBody(agregarPronombreSchema),
    colaboradorController.agregarPronombre,
  );
  router.delete(
    "/:id/pronombres/:pronombre",
    editarPerfil,
    colaboradorController.quitarPronombre,
  );

  router.post(
    "/:id/habilidades",
    editarPerfil,
    validarBody(agregarHabilidadColaboradorSchema),
    colaboradorController.agregarHabilidad,
  );
  router.delete(
    "/:id/habilidades/:codigoHabilidad",
    editarPerfil,
    colaboradorController.quitarHabilidad,
  );

  router.get(
    "/:id/medios-de-contacto",
    autorizacion.soloConAutenticacion,
    editarPerfil,
    colaboradorController.mediosDeContacto,
  );

  router.post(
    "/:id/medios-de-contacto",
    editarPerfil,
    validarBody(medioDeContactoSchema),
    colaboradorController.agregarMedioDeContacto,
  );
  router.delete(
    "/:id/medios-de-contacto/:tipo/:valor",
    editarPerfil,
    validarParams(medioDeContactoEnRutaSchema),
    colaboradorController.quitarMedioDeContacto,
  );

  router.get(
    "/:id/colaboraciones",
    autorizacion.opcional,
    colaboradorController.listarColaboraciones,
  );
  router.get("/:id/valoraciones", colaboradorController.listarValoraciones);

  router.get(
    "/:id/proyectos-potenciales",
    permiso(PERMISO.PROYECTOS_POTENCIALES_VER),
    colaboradoraDe(),
    validarQuery(paginacionSchema),
    reclutamientoController.buscarProyectos,
  );

  router.get(
    "/:id/notificaciones",
    permiso(PERMISO.NOTIFICACIONES_VER),
    colaboradoraDe(),
    validarQuery(listadoDeNotificacionesSchema),
    notificacionController.listar,
  );
  router.post(
    "/:id/notificaciones/:notificacionId/lectura",
    permiso(PERMISO.NOTIFICACIONES_VER),
    colaboradoraDe(),
    notificacionController.marcarComoLeida,
  );

  return router;
}
