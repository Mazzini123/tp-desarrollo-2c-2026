import { Router } from "express";
import { validarBody, validarQuery } from "../middlewares/validar.js";
import { paginacionSchema } from "../schemas/paginacionSchema.js";
import {
  crearColaboradorSchema,
  actualizarColaboradorSchema,
  agregarPronombreSchema,
  agregarHabilidadColaboradorSchema,
} from "../schemas/colaboradorSchema.js";
import { medioDeContactoSchema } from "../schemas/medioDeContactoSchema.js";

export function crearColaboradoresRouter(colaboradorController, notificacionController) {
  const router = Router();

  router.post("/", validarBody(crearColaboradorSchema), colaboradorController.crear);
  router.get("/", validarQuery(paginacionSchema), colaboradorController.listar);
  router.get("/:id", colaboradorController.obtenerPorId);
  router.put("/:id",
    validarBody(actualizarColaboradorSchema),
    colaboradorController.actualizar,
  );

  router.post(
    "/:id/pronombres",
    validarBody(agregarPronombreSchema),
    colaboradorController.agregarPronombre,
  );
  router.delete("/:id/pronombres/:pronombre", colaboradorController.quitarPronombre);

  router.post(
    "/:id/habilidades",
    validarBody(agregarHabilidadColaboradorSchema),
    colaboradorController.agregarHabilidad,
  );
  router.delete("/:id/habilidades/:codigoHabilidad", colaboradorController.quitarHabilidad);

  // Solo alta y baja: los medios de contacto no se muestran por la API.
  router.post(
    "/:id/medios-de-contacto",
    validarBody(medioDeContactoSchema),
    colaboradorController.agregarMedioDeContacto,
  );
  router.delete(
    "/:id/medios-de-contacto/:tipo/:valor",
    colaboradorController.quitarMedioDeContacto,
  );

  router.get("/:id/colaboraciones", colaboradorController.listarColaboraciones);

  // La bandeja de mensajes internos de la persona.
  router.get(
    "/:id/notificaciones",
    validarQuery(paginacionSchema),
    notificacionController.listar,
  );
  router.post(
    "/:id/notificaciones/:notificacionId/lectura",
    notificacionController.marcarComoLeida,
  );

  return router;
}
