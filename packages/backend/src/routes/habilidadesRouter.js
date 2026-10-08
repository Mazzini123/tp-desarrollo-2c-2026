import { Router } from "express";
import { validarBody, validarQuery } from "../middlewares/validar.js";
import { paginacionSchema } from "../schemas/paginacionSchema.js";
import { crearHabilidadSchema } from "../schemas/habilidadSchema.js";

export function crearHabilidadesRouter(habilidadController) {
  const router = Router();

  router.post("/", validarBody(crearHabilidadSchema), habilidadController.crear);
  router.get("/", validarQuery(paginacionSchema), habilidadController.listar);

  return router;
}
