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
import { listadoConEtiquetaSchema } from "../schemas/comunesSchema.js";
import { valoracionSchema } from "../schemas/valoracionSchema.js";
import { crearLogroSchema, 
         actualizarLogroSchema
} from "../schemas/logroSchema.js";
import { crearAvanceSchema } from "../schemas/avanceSchema.js";

export function crearProyectosRouter(
  proyectoController,
  perfilController,
  reclutamientoController,
  postulacionController,
  logroController,
  avanceController
) {
  const router = Router();

  router.get("/", validarQuery(listadoConEtiquetaSchema), proyectoController.listar);
  router.get("/:id", proyectoController.obtenerPorId);
  router.put(
    "/:id",
    validarBody(actualizarProyectoSchema),
    proyectoController.actualizar,
  );

  router.post("/:id/finalizacion", proyectoController.finalizar);

  router.post("/:id/perfiles", validarBody(crearPerfilSchema), perfilController.crear);
  router.get("/:id/perfiles", perfilController.listar);
  router.get("/:id/perfiles/:perfilId", perfilController.obtenerPorId);
  router.put(
    "/:id/perfiles/:perfilId",
    validarBody(actualizarPerfilSchema),
    perfilController.actualizar,
  );
  router.delete("/:id/perfiles/:perfilId", perfilController.eliminar);

  router.post(
    "/:id/perfiles/:perfilId/habilidades-requeridas",
    validarBody(agregarHabilidadPerfilSchema),
    perfilController.agregarHabilidadRequerida,
  );
  router.delete(
    "/:id/perfiles/:perfilId/habilidades-requeridas/:codigoHabilidad",
    perfilController.quitarHabilidadRequerida,
  );

  router.post(
    "/:id/perfiles/:perfilId/habilidades-opcionales",
    validarBody(agregarHabilidadPerfilSchema),
    perfilController.agregarHabilidadOpcional,
  );
  router.delete(
    "/:id/perfiles/:perfilId/habilidades-opcionales/:codigoHabilidad",
    perfilController.quitarHabilidadOpcional,
  );

  // Busqueda de potenciales colaboradoras para un perfil, e invitacion.
  router.get(
    "/:id/perfiles/:perfilId/colaboradoras-potenciales",
    validarQuery(paginacionSchema),
    reclutamientoController.buscarColaboradoras,
  );
  router.post(
    "/:id/perfiles/:perfilId/invitaciones",
    validarBody(invitacionSchema),
    reclutamientoController.invitar,
  );

  router.post(
    "/:id/colaboraciones",
    validarBody(anotarColaboradorSchema),
    proyectoController.anotarColaborador,
  );
  router.get("/:id/colaboraciones", proyectoController.listarColaboraciones);

  // Resolucion manual de una postulacion (req. adicional 8).
  router.post(
    "/:id/colaboraciones/:colaboracionId/aceptacion",
    postulacionController.aceptar,
  );
  router.post("/:id/colaboraciones/:colaboracionId/rechazo", postulacionController.rechazar);

  // Fin de una colaboracion y valoraciones mutuas (req. adicional 39).
  router.post(
    "/:id/colaboraciones/:colaboracionId/finalizacion",
    postulacionController.finalizar,
  );
  router.post(
    "/:id/colaboraciones/:colaboracionId/valoraciones",
    validarBody(valoracionSchema),
    postulacionController.valorar,
  );

  // Logros
  router.post(
    "/:id/logros",
    validarBody(crearLogroSchema),
    logroController.crearParaProyecto
  );

  router.get(
    "/:id/logros",
    logroController.conseguirTodosDeProyecto
  )

  router.get(
    "/:id/logros/:logroId",
    logroController.conseguirPorIdParaProyecto
  )

  router.put(
    "/:id/logros/:logroId",
    validarBody(actualizarLogroSchema),
    logroController.actualizarParaProyecto
  )

  router.delete(
    "/:id/logros/:logroId",
    logroController.eliminarParaProyecto
  )

  // Avances
  router.post(
    "/:id/avances",
    validarBody(crearAvanceSchema),
    avanceController.registrarAvanceParaProyecto
  )

  router.get(
    "/:id/avances",
    avanceController.listarParaProyecto
  )

  router.get(
    "/:id/avances/:avanceId",
    avanceController.buscarPorIdParaProyecto
  )

  return router;
}
