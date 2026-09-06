import { Router } from "express";
import { HabilidadController } from "../controllers/HabilidadController.js";
import { validate } from "../middlewares/validate.js";
import { crearHabilidadSchema } from "../schemas/habilidad.schema.js";

const router = Router();
const habilidadController = new HabilidadController();

router.post("/", validate(crearHabilidadSchema), habilidadController.crear);
router.get("/", habilidadController.listar);

export default router;
