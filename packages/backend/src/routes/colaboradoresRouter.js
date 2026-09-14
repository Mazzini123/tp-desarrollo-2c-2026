import { Router } from "express";
import { validarBody, validarQuery } from "../middlewares/validar.js";
import { paginacionSchema } from "../schemas/paginacionSchema.js";
import {
  crearColaboradorSchema,
  actualizarColaboradorSchema,
  agregarPronombreSchema,
} from "../schemas/colaboradorSchema.js";
import { agregarHabilidadSchema } from "../schemas/proyectoSchema.js";

export function crearColaboradoresRouter(colaboradorController) {
  const router = Router();

  router.post("/", validarBody(crearColaboradorSchema), colaboradorController.crear);
  router.get("/", validarQuery(paginacionSchema), colaboradorController.listar);
  router.get("/:id", colaboradorController.obtenerPorId);
  router.put(
    "/:id",
    validarBody(actualizarColaboradorSchema),
    colaboradorController.actualizar,
  );

  // Correccion C1: las operaciones de a uno, que son las que tiran 409.
  router.post(
    "/:id/pronombres",
    validarBody(agregarPronombreSchema),
    colaboradorController.agregarPronombre,
  );
  router.delete("/:id/pronombres/:pronombre", colaboradorController.quitarPronombre);

  router.post(
    "/:id/habilidades",
    validarBody(agregarHabilidadSchema),
    colaboradorController.agregarHabilidad,
  );
  router.delete("/:id/habilidades/:codigoHabilidad", colaboradorController.quitarHabilidad);

  router.get("/:id/colaboraciones", colaboradorController.listarColaboraciones);

  return router;
}
