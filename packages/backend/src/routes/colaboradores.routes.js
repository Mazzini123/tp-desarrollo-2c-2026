import { Router } from "express";
import * as colaboradoresController from "../controllers/colaboradores.controller.js";
import { validate } from "../middlewares/validate.js";
import {
  crearColaboradorSchema,
  actualizarColaboradorSchema,
} from "../schemas/colaborador.schema.js";
import { agregarHabilidadSchema } from "../schemas/proyecto.schema.js";

const router = Router();

router.post("/", validate(crearColaboradorSchema), colaboradoresController.crear);
router.get("/", colaboradoresController.listar);
router.get("/:id", colaboradoresController.obtenerPorId);
router.put("/:id", validate(actualizarColaboradorSchema), colaboradoresController.actualizar);

router.post(
  "/:id/habilidades",
  validate(agregarHabilidadSchema),
  colaboradoresController.agregarHabilidad,
);
router.delete("/:id/habilidades/:codigoHabilidad", colaboradoresController.quitarHabilidad);

router.get("/:id/colaboraciones", colaboradoresController.listarColaboraciones);

export default router;
