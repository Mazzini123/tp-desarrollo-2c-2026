import { Router } from "express";
import { ColaboradorController } from "../controllers/ColaboradorController.js";

const router = Router();
const colaboradorController = new ColaboradorController();

router.post("/", colaboradorController.crear);
router.get("/", colaboradorController.listar);
router.get("/:id", colaboradorController.obtenerPorId);
router.put("/:id", colaboradorController.actualizar);

router.post(
  "/:id/habilidades",
  colaboradorController.agregarHabilidad,
);
router.delete("/:id/habilidades/:codigoHabilidad", colaboradorController.quitarHabilidad);

router.get("/:id/colaboraciones", colaboradorController.listarColaboraciones);

export default router;
