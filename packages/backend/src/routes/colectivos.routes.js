import { Router } from "express";
import * as colectivosController from "../controllers/colectivos.controller.js";

const router = Router();

router.post("/", colectivosController.crear);
router.get("/", colectivosController.listar);
router.get("/:id", colectivosController.obtenerPorId);
router.put("/:id", colectivosController.actualizar);

// Alta de proyectos anidada: el proyecto pertenece al colectivo.
router.post("/:id/proyectos", colectivosController.crearProyecto);
router.get("/:id/proyectos", colectivosController.listarProyectos);

export default router;
