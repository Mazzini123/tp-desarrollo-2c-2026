import { Router } from "express";
import * as habilidadesController from "../controllers/habilidades.controller.js";

const router = Router();

router.post("/", habilidadesController.crear);
router.get("/", habilidadesController.listar);

export default router;
