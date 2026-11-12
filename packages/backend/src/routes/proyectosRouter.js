import { Router } from "express";
import { validarIdsDeRuta } from "../middlewares/validarIds.js";
import { validarBody, validarQuery } from "../middlewares/validar.js";
import {
  paginacionSchema,
  listadoDeColaboracionesSchema,
} from "../schemas/paginacionSchema.js";
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
import { PERMISO } from "../security/autorizacion/enums/PERMISO.js";

export function crearProyectosRouter(controllers, autorizacion) {
  const {
    proyecto: proyectoController,
    perfil: perfilController,
    reclutamiento: reclutamientoController,
    postulacion: postulacionController,
    logro: logroController,
    avance: avanceController,
  } = controllers;
  const router = validarIdsDeRuta(Router());
  const { permiso, duenoDelProyecto } = autorizacion;
  const delDueno = (codigo) => [permiso(codigo), duenoDelProyecto];
  const editar = delDueno(PERMISO.PROYECTO_EDITAR);
  const reclutar = delDueno(PERMISO.RECLUTAMIENTO_GESTIONAR);
  const resolverPostulacion = delDueno(PERMISO.POSTULACION_RESOLVER);

  router.get("/", validarQuery(listadoDeProyectosSchema), proyectoController.listar);
  router.get("/:id", autorizacion.opcional, proyectoController.obtenerPorId);
  router.put(
    "/:id",
    editar,
    validarBody(actualizarProyectoSchema),
    proyectoController.actualizar,
  );

  router.post(
    "/:id/finalizacion",
    delDueno(PERMISO.PROYECTO_FINALIZAR),
    proyectoController.finalizar,
  );

  router.post(
    "/:id/perfiles",
    editar,
    validarBody(crearPerfilSchema),
    perfilController.crear,
  );
  router.get(
    "/:id/participaciones",
    validarQuery(paginacionSchema),
    proyectoController.listarParticipaciones,
  );
  router.get("/:id/perfiles", perfilController.listar);
  router.get("/:id/perfiles/:perfilId", perfilController.obtenerPorId);
  router.put(
    "/:id/perfiles/:perfilId",
    editar,
    validarBody(actualizarPerfilSchema),
    perfilController.actualizar,
  );
  router.delete("/:id/perfiles/:perfilId", editar, perfilController.eliminar);

  router.post(
    "/:id/perfiles/:perfilId/habilidades-requeridas",
    editar,
    validarBody(agregarHabilidadPerfilSchema),
    perfilController.agregarHabilidadRequerida,
  );
  router.delete(
    "/:id/perfiles/:perfilId/habilidades-requeridas/:codigoHabilidad",
    editar,
    perfilController.quitarHabilidadRequerida,
  );

  router.post(
    "/:id/perfiles/:perfilId/habilidades-opcionales",
    editar,
    validarBody(agregarHabilidadPerfilSchema),
    perfilController.agregarHabilidadOpcional,
  );
  router.delete(
    "/:id/perfiles/:perfilId/habilidades-opcionales/:codigoHabilidad",
    editar,
    perfilController.quitarHabilidadOpcional,
  );

  router.get(
    "/:id/perfiles/:perfilId/colaboradoras-potenciales",
    reclutar,
    validarQuery(paginacionSchema),
    reclutamientoController.buscarColaboradoras,
  );
  router.post(
    "/:id/perfiles/:perfilId/invitaciones",
    reclutar,
    validarBody(invitacionSchema),
    reclutamientoController.invitar,
  );

  router.post(
    "/:id/colaboraciones",
    validarBody(anotarColaboradorSchema),
    permiso(PERMISO.POSTULACION_CREAR),
    autorizacion.colaboradoraDelBody,
    proyectoController.anotarColaborador,
  );
  router.get(
    "/:id/colaboraciones",
    resolverPostulacion,
    validarQuery(listadoDeColaboracionesSchema),
    proyectoController.listarColaboraciones,
  );

  router.post(
    "/:id/colaboraciones/:colaboracionId/aceptacion",
    resolverPostulacion,
    postulacionController.aceptar,
  );
  router.post(
    "/:id/colaboraciones/:colaboracionId/rechazo",
    resolverPostulacion,
    postulacionController.rechazar,
  );
  router.post(
    "/:id/colaboraciones/:colaboracionId/retiro",
    permiso(PERMISO.POSTULACION_RETIRAR),
    autorizacion.participanteDeLaColaboracion({ colectivo: false }),
    postulacionController.retirar,
  );
  router.post(
    "/:id/colaboraciones/:colaboracionId/desvinculacion",
    permiso(PERMISO.COLABORACION_DESVINCULAR),
    autorizacion.participanteDeLaColaboracion(),
    postulacionController.desvincular,
  );

  router.post(
    "/:id/colaboraciones/:colaboracionId/finalizacion",
    permiso(PERMISO.COLABORACION_FINALIZAR),
    autorizacion.participanteDeLaColaboracion(),
    postulacionController.finalizar,
  );
  router.post(
    "/:id/colaboraciones/:colaboracionId/valoraciones",
    validarBody(valoracionSchema),
    permiso(PERMISO.COLABORACION_VALORAR),
    autorizacion.autorDeLaValoracion,
    postulacionController.valorar,
  );

  // Logros
  router.post(
    "/:id/logros",
    editar,
    validarBody(crearLogroSchema),
    logroController.crear,
  );

  router.get("/:id/logros", logroController.listar);

  router.get("/:id/logros/:logroId", logroController.buscarPorId);

  router.put(
    "/:id/logros/:logroId",
    editar,
    validarBody(actualizarLogroSchema),
    logroController.actualizar,
  );

  router.delete("/:id/logros/:logroId", editar, logroController.eliminar);

  // Avances
  router.post(
    "/:id/avances",
    editar,
    validarBody(crearAvanceSchema),
    avanceController.registrar,
  );

  router.get("/:id/avances", avanceController.listar);

  router.get("/:id/avances/:avanceId", avanceController.buscarPorId);

  router.get(
    "/:id/colaboradores/:colaboradorId/contacto",
    autorizacion.soloConAutenticacion,
    delDueno(PERMISO.CONTACTO_COLABORADORA_VER),
    proyectoController.datosDeContacto,
  );

  return router;
}
