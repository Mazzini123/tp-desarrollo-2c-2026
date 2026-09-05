import { Router } from "express";
import * as colectivosController from "../controllers/colectivos.controller.js";
import { validate } from "../middlewares/validate.js";
import {
  crearColectivoSchema,
  actualizarColectivoSchema,
} from "../schemas/colectivo.schema.js";
import { crearProyectoSchema } from "../schemas/proyecto.schema.js";

const router = Router();

router.post("/", validate(crearColectivoSchema), colectivosController.crear);
router.get("/", colectivosController.listar);
router.get("/:id", colectivosController.obtenerPorId);
router.put("/:id", validate(actualizarColectivoSchema), colectivosController.actualizar);

// Alta de proyectos anidada: el proyecto pertenece al colectivo.
router.post(
  "/:id/proyectos",
  validate(crearProyectoSchema),
  colectivosController.crearProyecto,
);
router.get("/:id/proyectos", colectivosController.listarProyectos);

export default router;
