import { Router } from "express";
import * as proyectosController from "../controllers/proyectos.controller.js";

const router = Router();

// El alta está en POST /colectivos/:id/proyectos, porque un proyecto
// no existe fuera de su colectivo.
router.get("/", proyectosController.listar);
router.get("/:id", proyectosController.obtenerPorId);
router.put("/:id", proyectosController.actualizar);
router.patch("/:id/cierre", proyectosController.finalizar);

router.post("/:id/habilidades", proyectosController.agregarHabilidad);
router.delete("/:id/habilidades/:codigoHabilidad", proyectosController.quitarHabilidad);

router.post("/:id/colaboraciones", proyectosController.anotarColaborador);
router.get("/:id/colaboraciones", proyectosController.listarColaboraciones);

export default router;
