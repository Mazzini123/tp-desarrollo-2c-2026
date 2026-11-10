import { Router } from "express";
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

export function crearColectivosRouter(
  colectivoController,
  estadisticaController,
  autorizacion,
  membresiaController,
) {
  const router = Router();
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
    colectivoController.listarProyectos,
  );
  router.get("/:id/valoraciones", colectivoController.listarValoraciones);
  router.get("/:id/timeline", colectivoController.timeline);
  router.get(
    "/:id/estadisticas",
    permiso(PERMISO.COLECTIVO_ESTADISTICAS_VER),
    colectivoDe(),
    estadisticaController.deColectivo,
  );

  if (autorizacion.activa) {
    router.post(
      "/:id/baja",
      permiso(PERMISO.COLECTIVO_ELIMINAR),
      colectivoDe(),
      colectivoController.darDeBaja,
    );
    router.get(
      "/:id/medios-de-contacto",
      permiso(PERMISO.COLECTIVO_CONTACTO_GESTIONAR),
      colectivoDe(),
      colectivoController.mediosDeContacto,
    );
    router.post(
      "/:id/medios-de-contacto",
      permiso(PERMISO.COLECTIVO_CONTACTO_GESTIONAR),
      colectivoDe(),
      validarBody(medioDeContactoSchema),
      colectivoController.agregarMedioDeContacto,
    );
    router.delete(
      "/:id/medios-de-contacto/:tipo/:valor",
      permiso(PERMISO.COLECTIVO_CONTACTO_GESTIONAR),
      colectivoDe(),
      validarParams(medioDeContactoEnRutaSchema),
      colectivoController.quitarMedioDeContacto,
    );

    router.post(
      "/:id/solicitudes-ingreso",
      autorizacion.usuario(),
      autorizacion.nombre,
      membresiaController.solicitar,
    );
    router.post(
      "/:id/solicitudes-ingreso/:solicitudId/cancelacion",
      autorizacion.usuario(),
      membresiaController.cancelar,
    );
    router.get(
      "/:id/solicitudes-ingreso",
      permiso(PERMISO.COLECTIVO_MIEMBROS_VER),
      colectivoDe(),
      validarQuery(listadoDeSolicitudesSchema),
      membresiaController.listarSolicitudes,
    );
    router.post(
      "/:id/solicitudes-ingreso/:solicitudId/aceptacion",
      permiso(PERMISO.MEMBRESIA_SOLICITUD_RESOLVER),
      colectivoDe(),
      membresiaController.aceptar,
    );
    router.post(
      "/:id/solicitudes-ingreso/:solicitudId/rechazo",
      permiso(PERMISO.MEMBRESIA_SOLICITUD_RESOLVER),
      colectivoDe(),
      membresiaController.rechazar,
    );
    router.get(
      "/:id/miembros",
      permiso(PERMISO.COLECTIVO_MIEMBROS_VER),
      colectivoDe(),
      membresiaController.listarMiembros,
    );
    router.delete(
      "/:id/miembros/:contextoId",
      permiso(PERMISO.MIEMBRO_ELIMINAR),
      colectivoDe(),
      membresiaController.quitarMiembro,
    );
    router.post("/:id/abandono", permiso(), colectivoDe(), membresiaController.abandonar);
    router.post(
      "/:id/lider",
      permiso(PERMISO.LIDER_ASIGNAR),
      colectivoDe(),
      validarBody(transferirLiderazgoSchema),
      membresiaController.transferirLiderazgo,
    );
  }

  return router;
}
