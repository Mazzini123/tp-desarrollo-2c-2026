import { Router } from "express";
import { validarBody, validarQuery } from "../middlewares/validar.js";
import { paginacionSchema } from "../schemas/paginacionSchema.js";
import {
  crearColaboradorSchema,
  actualizarColaboradorSchema,
  agregarPronombreSchema,
  agregarHabilidadColaboradorSchema,
} from "../schemas/colaboradorSchema.js";

export function crearColaboradoresRouter(colaboradorController) {
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

  router.get("/:id/colaboraciones", colaboradorController.listarColaboraciones);

  return router;
}
