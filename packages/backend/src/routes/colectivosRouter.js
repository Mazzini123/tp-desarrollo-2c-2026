import { Router } from "express";
import { validarBody, validarQuery } from "../middlewares/validar.js";
import { paginacionSchema } from "../schemas/paginacionSchema.js";
import {
  crearColectivoSchema,
  actualizarColectivoSchema,
} from "../schemas/colectivoSchema.js";
import { crearProyectoSchema } from "../schemas/proyectoSchema.js";

/**
 * Correccion B1: el router ya no construye el controller, lo recibe.
 * Correccion A2: cada ruta declara que valida antes de delegar.
 *
 * El efecto secundario es que este archivo se lee como el contrato del
 * recurso: metodo, ruta, validacion y quien atiende, en una linea.
 */
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
