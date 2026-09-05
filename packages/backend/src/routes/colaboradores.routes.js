import { Router } from "express";
import * as colaboradoresController from "../controllers/colaboradores.controller.js";

const router = Router();

router.post("/", colaboradoresController.crear);
router.get("/", colaboradoresController.listar);
router.get("/:id", colaboradoresController.obtenerPorId);
router.put("/:id", colaboradoresController.actualizar);

router.post("/:id/habilidades", colaboradoresController.agregarHabilidad);
router.delete("/:id/habilidades/:codigoHabilidad", colaboradoresController.quitarHabilidad);

router.get("/:id/colaboraciones", colaboradoresController.listarColaboraciones);

export default router;
