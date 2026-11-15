import { Router } from "express";
import { validarQuery } from "../middlewares/validar.js";
import { paginacionSchema } from "../schemas/paginacionSchema.js";

export function crearHabilidadesRouter(habilidadController) {
  const router = Router();

  router.get("/", validarQuery(paginacionSchema), habilidadController.listar);

  return router;
}
