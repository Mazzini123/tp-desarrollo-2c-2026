import { Router } from "express";
import { validarBody, validarQuery } from "../middlewares/validar.js";
import {
  crearColectivoSchema,
  actualizarColectivoSchema,
} from "../schemas/colectivoSchema.js";
import { crearProyectoSchema } from "../schemas/proyectoSchema.js";
import { listadoConEtiquetaSchema } from "../schemas/comunesSchema.js";

export function crearColectivosRouter(colectivoController) {
  const router = Router();

  router.post("/", validarBody(crearColectivoSchema), colectivoController.crear);
  router.get("/", validarQuery(listadoConEtiquetaSchema), colectivoController.listar);
  router.get("/:id", colectivoController.obtenerPorId);
  router.put("/:id", validarBody(actualizarColectivoSchema), colectivoController.actualizar);
  // Req. adicional 23. Es una accion (como /finalizacion) y no un DELETE: el
  // colectivo sigue existiendo como historia, asi que GET /colectivos/:id
  // tiene que seguir respondiendo.
  router.post("/:id/baja", colectivoController.darDeBaja);

  router.post(
    "/:id/proyectos",
    validarBody(crearProyectoSchema),
    colectivoController.crearProyecto,
  );
  router.get("/:id/proyectos", colectivoController.listarProyectos);
  router.get("/:id/valoraciones", colectivoController.listarValoraciones);

  return router;
}
