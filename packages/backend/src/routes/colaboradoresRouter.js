import { Router } from "express";
import { ColaboradorController } from "../controllers/ColaboradorController.js";
import { validate } from "../middlewares/validate.js";
import {
  crearColaboradorSchema,
  actualizarColaboradorSchema,
} from "../schemas/colaborador.schema.js";
import { agregarHabilidadSchema } from "../schemas/proyecto.schema.js";

const router = Router();
const colaboradorController = new ColaboradorController();

router.post("/", validate(crearColaboradorSchema), colaboradorController.crear);
router.get("/", colaboradorController.listar);
router.get("/:id", colaboradorController.obtenerPorId);
router.put("/:id", validate(actualizarColaboradorSchema), colaboradorController.actualizar);

router.post(
  "/:id/habilidades",
  validate(agregarHabilidadSchema),
  colaboradorController.agregarHabilidad,
);
router.delete("/:id/habilidades/:codigoHabilidad", colaboradorController.quitarHabilidad);

router.get("/:id/colaboraciones", colaboradorController.listarColaboraciones);

export default router;
