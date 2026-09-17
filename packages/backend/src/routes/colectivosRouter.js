import { Router } from "express";
import { validarBody, validarQuery } from "../middlewares/validar.js";
import { paginacionSchema } from "../schemas/paginacionSchema.js";
import {
  crearColectivoSchema,
  actualizarColectivoSchema,
} from "../schemas/colectivoSchema.js";
import { crearProyectoSchema } from "../schemas/proyectoSchema.js";

export function crearColectivosRouter(colectivoController) {
  const router = Router();

  router.post("/", validarBody(crearColectivoSchema), colectivoController.crear);
  router.get("/", validarQuery(paginacionSchema), colectivoController.listar);
  router.get("/:id", colectivoController.obtenerPorId);
  router.put("/:id", validarBody(actualizarColectivoSchema), colectivoController.actualizar);

  router.post(
    "/:id/proyectos",
    validarBody(crearProyectoSchema),
    colectivoController.crearProyecto,
  );
  router.get("/:id/proyectos", colectivoController.listarProyectos);

  return router;
}
