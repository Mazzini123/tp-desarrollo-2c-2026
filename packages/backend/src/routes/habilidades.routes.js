import { Router } from "express";
import * as habilidadesController from "../controllers/habilidades.controller.js";
import { validate } from "../middlewares/validate.js";
import { crearHabilidadSchema } from "../schemas/habilidad.schema.js";

const router = Router();

router.post("/", validate(crearHabilidadSchema), habilidadesController.crear);
router.get("/", habilidadesController.listar);

export default router;
