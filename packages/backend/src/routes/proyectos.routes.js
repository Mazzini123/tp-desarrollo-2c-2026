import { Router } from "express";
import * as proyectosController from "../controllers/proyectos.controller.js";

const router = Router();

router.post("/", proyectosController.crear);
router.get("/", proyectosController.listar);
router.get("/:id", proyectosController.obtenerPorId);
router.put("/:id", proyectosController.actualizar);
router.patch("/:id/cierre", proyectosController.finalizar);

router.post("/:id/habilidades", proyectosController.agregarHabilidad);
router.delete("/:id/habilidades/:codigoHabilidad", proyectosController.quitarHabilidad);

// Anotar una persona colaboradora = crear una Colaboracion en el
// contexto de este proyecto (requerimiento 2b).
router.post("/:id/colaboraciones", proyectosController.anotarColaboradora);
router.get("/:id/colaboraciones", proyectosController.listarColaboraciones);

export default router;
