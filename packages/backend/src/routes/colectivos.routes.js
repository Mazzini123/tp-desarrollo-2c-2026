import { Router } from "express";
import { ColectivoController } from "../controllers/ColectivoController.js";
import { validate } from "../middlewares/validate.js";
import {
  crearColectivoSchema,
  actualizarColectivoSchema,
} from "../schemas/colectivo.schema.js";
import { crearProyectoSchema } from "../schemas/proyecto.schema.js";

const router = Router();
const colectivoController = new ColectivoController();

router.post("/", validate(crearColectivoSchema), colectivoController.crear);
router.get("/", colectivoController.listar);
router.get("/:id", colectivoController.obtenerPorId);
router.put("/:id", validate(actualizarColectivoSchema), colectivoController.actualizar);

// Alta de proyectos anidada: el proyecto pertenece al colectivo.
router.post("/:id/proyectos", validate(crearProyectoSchema), colectivoController.crearProyecto);
router.get("/:id/proyectos", colectivoController.listarProyectos);

export default router;
