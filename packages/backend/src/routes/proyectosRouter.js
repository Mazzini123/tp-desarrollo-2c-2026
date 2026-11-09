import { Router } from "express";
import { validarBody, validarQuery } from "../middlewares/validar.js";
import { paginacionSchema } from "../schemas/paginacionSchema.js";
import {
  actualizarProyectoSchema,
  anotarColaboradorSchema,
} from "../schemas/proyectoSchema.js";
import {
  actualizarPerfilSchema,
  agregarHabilidadPerfilSchema,
  crearPerfilSchema,
} from "../schemas/perfilSchema.js";
import { invitacionSchema } from "../schemas/reclutamientoSchema.js";
import { listadoDeProyectosSchema } from "../schemas/comunesSchema.js";
import { valoracionSchema } from "../schemas/valoracionSchema.js";
import { crearLogroSchema, actualizarLogroSchema } from "../schemas/logroSchema.js";
import { crearAvanceSchema } from "../schemas/avanceSchema.js";

export function crearProyectosRouter(
  proyectoController,
  perfilController,
  reclutamientoController,
  postulacionController,
  logroController,
  avanceController,
  autorizacion,
) {
  const router = Router();

  router.get("/", validarQuery(listadoDeProyectosSchema), proyectoController.listar);
  router.get("/:id", proyectoController.obtenerPorId);
  router.put(
    "/:id",
    autorizacion.duenoDelProyecto,
    validarBody(actualizarProyectoSchema),
    proyectoController.actualizar,
  );

  router.post(
    "/:id/finalizacion",
    autorizacion.duenoDelProyecto,
    proyectoController.finalizar,
  );

  router.post(
    "/:id/perfiles",
    autorizacion.duenoDelProyecto,
    validarBody(crearPerfilSchema),
    perfilController.crear,
  );
  router.get("/:id/perfiles", perfilController.listar);
  router.get("/:id/perfiles/:perfilId", perfilController.obtenerPorId);
  router.put(
    "/:id/perfiles/:perfilId",
    autorizacion.duenoDelProyecto,
    validarBody(actualizarPerfilSchema),
    perfilController.actualizar,
  );
  router.delete(
    "/:id/perfiles/:perfilId",
    autorizacion.duenoDelProyecto,
    perfilController.eliminar,
  );

  router.post(
    "/:id/perfiles/:perfilId/habilidades-requeridas",
    autorizacion.duenoDelProyecto,
    validarBody(agregarHabilidadPerfilSchema),
    perfilController.agregarHabilidadRequerida,
  );
  router.delete(
    "/:id/perfiles/:perfilId/habilidades-requeridas/:codigoHabilidad",
    autorizacion.duenoDelProyecto,
    perfilController.quitarHabilidadRequerida,
  );

  router.post(
    "/:id/perfiles/:perfilId/habilidades-opcionales",
    autorizacion.duenoDelProyecto,
    validarBody(agregarHabilidadPerfilSchema),
    perfilController.agregarHabilidadOpcional,
  );
  router.delete(
    "/:id/perfiles/:perfilId/habilidades-opcionales/:codigoHabilidad",
    autorizacion.duenoDelProyecto,
    perfilController.quitarHabilidadOpcional,
  );

  // Busqueda de potenciales colaboradoras para un perfil, e invitacion.
  router.get(
    "/:id/perfiles/:perfilId/colaboradoras-potenciales",
    autorizacion.duenoDelProyecto,
    validarQuery(paginacionSchema),
    reclutamientoController.buscarColaboradoras,
  );
  router.post(
    "/:id/perfiles/:perfilId/invitaciones",
    autorizacion.duenoDelProyecto,
    validarBody(invitacionSchema),
    reclutamientoController.invitar,
  );

  router.post(
    "/:id/colaboraciones",
    validarBody(anotarColaboradorSchema),
    autorizacion.colaboradoraDelBody,
    proyectoController.anotarColaborador,
  );
  router.get("/:id/colaboraciones", proyectoController.listarColaboraciones);

  // Resolucion manual de una postulacion (req. adicional 8).
  router.post(
    "/:id/colaboraciones/:colaboracionId/aceptacion",
    autorizacion.duenoDelProyecto,
    postulacionController.aceptar,
  );
  router.post(
    "/:id/colaboraciones/:colaboracionId/rechazo",
    autorizacion.duenoDelProyecto,
    postulacionController.rechazar,
  );
  router.post(
    "/:id/colaboraciones/:colaboracionId/retiro",
    autorizacion.participanteDeLaColaboracion({ colectivo: false }),
    postulacionController.retirar,
  );
  router.post(
    "/:id/colaboraciones/:colaboracionId/desvinculacion",
    autorizacion.participanteDeLaColaboracion(),
    postulacionController.desvincular,
  );

  // Fin de una colaboracion y valoraciones mutuas (req. adicional 39).
  router.post(
    "/:id/colaboraciones/:colaboracionId/finalizacion",
    autorizacion.participanteDeLaColaboracion(),
    postulacionController.finalizar,
  );
  router.post(
    "/:id/colaboraciones/:colaboracionId/valoraciones",
    validarBody(valoracionSchema),
    autorizacion.autorDeLaValoracion,
    postulacionController.valorar,
  );

  // Logros
  router.post(
    "/:id/logros",
    autorizacion.duenoDelProyecto,
    validarBody(crearLogroSchema),
    logroController.crearParaProyecto,
  );

  router.get("/:id/logros", logroController.conseguirTodosDeProyecto);

  router.get("/:id/logros/:logroId", logroController.conseguirPorIdParaProyecto);

  router.put(
    "/:id/logros/:logroId",
    autorizacion.duenoDelProyecto,
    validarBody(actualizarLogroSchema),
    logroController.actualizarParaProyecto,
  );

  router.delete(
    "/:id/logros/:logroId",
    autorizacion.duenoDelProyecto,
    logroController.eliminarParaProyecto,
  );

  // Avances
  router.post(
    "/:id/avances",
    autorizacion.duenoDelProyecto,
    validarBody(crearAvanceSchema),
    avanceController.registrarAvanceParaProyecto,
  );

  router.get("/:id/avances", avanceController.listarParaProyecto);

  router.get("/:id/avances/:avanceId", avanceController.buscarPorIdParaProyecto);

  if (autorizacion.activa) {
    router.get(
      "/:id/colaboradores/:colaboradorId/contacto",
      autorizacion.duenoDelProyecto,
      proyectoController.datosDeContacto,
    );
  }

  return router;
}
