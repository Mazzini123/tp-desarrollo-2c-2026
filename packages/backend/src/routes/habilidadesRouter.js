import { Router } from "express";
import { HabilidadController } from "../controllers/HabilidadController.js";

const router = Router();
const habilidadController = new HabilidadController();

router.post("/", habilidadController.crear);
router.get("/", habilidadController.listar);

export default router;
