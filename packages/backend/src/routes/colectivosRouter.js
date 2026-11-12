import { paginacionSchema } from "../schemas/paginacionSchema.js";
import { Router } from "express";
import { validarIdsDeRuta } from "../middlewares/validarIds.js";
import {
  validarBody,
  validarHeaders,
  validarParams,
  validarQuery,
} from "../middlewares/validar.js";
import {
  crearColectivoSchema,
  actualizarColectivoSchema,
} from "../schemas/colectivoSchema.js";
import {
  crearProyectoSchema,
  publicacionHeadersSchema,
} from "../schemas/proyectoSchema.js";
import {
  medioDeContactoEnRutaSchema,
  medioDeContactoSchema,
} from "../schemas/medioDeContactoSchema.js";
import { listadoConEtiquetaSchema } from "../schemas/comunesSchema.js";
import {
  listadoDeSolicitudesSchema,
  transferirLiderazgoSchema,
} from "../schemas/cuentaSchema.js";
import { PERMISO } from "../security/autorizacion/enums/PERMISO.js";

export function crearColectivosRouter(controllers, autorizacion) {
  const {
    colectivo: colectivoController,
    estadistica: estadisticaController,
    membresia: membresiaController,
  } = controllers;
  const router = validarIdsDeRuta(Router());
  const { permiso, colectivoDe } = autorizacion;

  router.post(
    "/",
    validarBody(crearColectivoSchema),
    autorizacion.usuario(),
    autorizacion.nombre,
    colectivoController.crear,
  );
  router.get("/", validarQuery(listadoConEtiquetaSchema), colectivoController.listar);
  router.get("/:id", autorizacion.opcional, colectivoController.obtenerPorId);
  router.put(
    "/:id",
    permiso(PERMISO.COLECTIVO_EDITAR),
    colectivoDe(),
    validarBody(actualizarColectivoSchema),
    colectivoController.actualizar,
  );

  router.post(
    "/:id/proyectos",
    permiso(PERMISO.PROYECTO_CREAR),
    colectivoDe(),
    validarHeaders(publicacionHeadersSchema),
    validarBody(crearProyectoSchema),
    colectivoController.crearProyecto,
  );
  router.get(
    "/:id/proyectos",
    autorizacion.opcional,
    validarQuery(paginacionSchema),
    colectivoController.listarProyectos,
  );
  router.get(
    "/:id/postulaciones",
    permiso(PERMISO.POSTULACION_RESOLVER),
    colectivoDe(),
    validarQuery(paginacionSchema),
    colectivoController.listarPendientes,
  );
  router.get("/:id/valoraciones", colectivoController.listarValoraciones);
  router.get("/:id/timeline", colectivoController.timeline);
  router.get(
    "/:id/estadisticas",
    permiso(PERMISO.COLECTIVO_ESTADISTICAS_VER),
    colectivoDe(),
    estadisticaController.deColectivo,
  );

  router.post(
    "/:id/baja",
    autorizacion.soloConAutenticacion,
    permiso(PERMISO.COLECTIVO_ELIMINAR),
    colectivoDe(),
    colectivoController.darDeBaja,
  );
  router.get(
    "/:id/medios-de-contacto",
    autorizacion.soloConAutenticacion,
    permiso(PERMISO.COLECTIVO_CONTACTO_GESTIONAR),
    colectivoDe(),
    colectivoController.mediosDeContacto,
  );
  router.post(
    "/:id/medios-de-contacto",
    autorizacion.soloConAutenticacion,
    permiso(PERMISO.COLECTIVO_CONTACTO_GESTIONAR),
    colectivoDe(),
    validarBody(medioDeContactoSchema),
    colectivoController.agregarMedioDeContacto,
  );
  router.delete(
    "/:id/medios-de-contacto/:tipo/:valor",
    autorizacion.soloConAutenticacion,
    permiso(PERMISO.COLECTIVO_CONTACTO_GESTIONAR),
    colectivoDe(),
    validarParams(medioDeContactoEnRutaSchema),
    colectivoController.quitarMedioDeContacto,
  );

  router.post(
    "/:id/solicitudes-ingreso",
    autorizacion.soloConAutenticacion,
    autorizacion.usuario(),
    autorizacion.nombre,
    membresiaController.solicitar,
  );
  router.post(
    "/:id/solicitudes-ingreso/:solicitudId/cancelacion",
    autorizacion.soloConAutenticacion,
    autorizacion.usuario(),
    membresiaController.cancelar,
  );
  router.get(
    "/:id/solicitudes-ingreso",
    autorizacion.soloConAutenticacion,
    permiso(PERMISO.COLECTIVO_MIEMBROS_VER),
    colectivoDe(),
    validarQuery(listadoDeSolicitudesSchema),
    membresiaController.listarSolicitudes,
  );
  router.post(
    "/:id/solicitudes-ingreso/:solicitudId/aceptacion",
    autorizacion.soloConAutenticacion,
    permiso(PERMISO.MEMBRESIA_SOLICITUD_RESOLVER),
    colectivoDe(),
    membresiaController.aceptar,
  );
  router.post(
    "/:id/solicitudes-ingreso/:solicitudId/rechazo",
    autorizacion.soloConAutenticacion,
    permiso(PERMISO.MEMBRESIA_SOLICITUD_RESOLVER),
    colectivoDe(),
    membresiaController.rechazar,
  );
  router.get(
    "/:id/miembros",
    autorizacion.soloConAutenticacion,
    permiso(PERMISO.COLECTIVO_MIEMBROS_VER),
    colectivoDe(),
    membresiaController.listarMiembros,
  );
  router.delete(
    "/:id/miembros/:contextoId",
    autorizacion.soloConAutenticacion,
    permiso(PERMISO.MIEMBRO_ELIMINAR),
    colectivoDe(),
    membresiaController.quitarMiembro,
  );
  router.post(
    "/:id/abandono",
    autorizacion.soloConAutenticacion,
    permiso(),
    colectivoDe(),
    membresiaController.abandonar,
  );
  router.post(
    "/:id/lider",
    autorizacion.soloConAutenticacion,
    permiso(PERMISO.LIDER_ASIGNAR),
    colectivoDe(),
    validarBody(transferirLiderazgoSchema),
    membresiaController.transferirLiderazgo,
  );

  return router;
}
