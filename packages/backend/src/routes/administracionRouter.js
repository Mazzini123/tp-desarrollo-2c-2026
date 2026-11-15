import { Router } from "express";
import { validarIdsDeRuta } from "../middlewares/validarIds.js";
import { validarBody, validarQuery } from "../middlewares/validar.js";
import {
  destacarProyectoSchema,
  listadoDeAuditoriaSchema,
  listadoDeRevisionesSchema,
  otorgarAdministradorSchema,
  resolverRevisionSchema,
} from "../schemas/administracionSchema.js";
import { PERMISO } from "../security/autorizacion/enums/PERMISO.js";

export function crearAdministracionRouter(controller, autorizacion) {
  const router = validarIdsDeRuta(Router());
  const { permiso, soloConAutenticacion } = autorizacion;

  router.use(soloConAutenticacion);

  router.get(
    "/auditoria",
    permiso(PERMISO.AUDITORIA_VER),
    validarQuery(listadoDeAuditoriaSchema),
    controller.listarAuditoria,
  );

  router.get(
    "/revisiones",
    permiso(PERMISO.REVISION_VER),
    validarQuery(listadoDeRevisionesSchema),
    controller.listarRevisiones,
  );
  router.post(
    "/revisiones/:id/resolucion",
    permiso(PERMISO.REVISION_RESOLVER),
    validarBody(resolverRevisionSchema),
    controller.resolverRevision,
  );

  router.put(
    "/proyectos/:id/destacado",
    permiso(PERMISO.PROYECTO_DESTACAR),
    validarBody(destacarProyectoSchema),
    controller.destacarProyecto,
  );
  router.delete(
    "/proyectos/:id/destacado",
    permiso(PERMISO.PROYECTO_DESTACAR),
    controller.quitarDestacado,
  );

  router.post(
    "/administradores",
    permiso(PERMISO.ADMIN_GESTIONAR),
    validarBody(otorgarAdministradorSchema),
    controller.otorgarAdministrador,
  );

  return router;
}
