import { Router } from "express";
import * as colectivosController from "../controllers/colectivos.controller.js";

const router = Router();

router.post("/", colectivosController.crear);
router.get("/", colectivosController.listar);
router.get("/:id", colectivosController.obtenerPorId);
router.put("/:id", colectivosController.actualizar);

export default router;
