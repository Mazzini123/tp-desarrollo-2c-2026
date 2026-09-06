import { Router } from "express";
import { ColectivoController } from "../controllers/ColectivoController.js";

const router = Router();
const colectivoController = new ColectivoController();

router.post("/", colectivoController.crear);
router.get("/", colectivoController.listar);
router.get("/:id", colectivoController.obtenerPorId);
router.put("/:id", colectivoController.actualizar);
// Mas adelante implementar delete

router.post("/:id/proyectos", colectivoController.crearProyecto);
router.get("/:id/proyectos", colectivoController.listarProyectos);

export default router;
