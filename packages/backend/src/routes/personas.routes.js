import { Router } from "express";
import * as personasController from "../controllers/personas.controller.js";

const router = Router();

router.post("/", personasController.crear);
router.get("/", personasController.listar);
router.get("/:id", personasController.obtenerPorId);
router.put("/:id", personasController.actualizar);

router.post("/:id/habilidades", personasController.agregarHabilidad);
router.delete("/:id/habilidades/:codigoHabilidad", personasController.quitarHabilidad);

router.get("/:id/colaboraciones", personasController.listarColaboraciones);

export default router;
