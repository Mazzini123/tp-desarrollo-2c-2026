import { Router } from "express";
import { ProyectoController } from "../controllers/ProyectoController.js";

const router = Router();
const proyectoController = new ProyectoController();

router.get("/", proyectoController.listar);
router.get("/:id", proyectoController.obtenerPorId);
router.put("/:id", proyectoController.actualizar);
router.patch("/:id", proyectoController.cambiarEstado);
router.post("/:id/habilidades", proyectoController.agregarHabilidad);
router.delete("/:id/habilidades/:codigoHabilidad", proyectoController.quitarHabilidad);

router.post(
  "/:id/colaboraciones",
  proyectoController.anotarColaborador,
);
router.get("/:id/colaboraciones", proyectoController.listarColaboraciones);

export default router;
