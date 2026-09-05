import { Router } from "express";
import * as proyectosController from "../controllers/proyectos.controller.js";
import { validate } from "../middlewares/validate.js";
import {
  actualizarProyectoSchema,
  agregarHabilidadSchema,
  anotarColaboradorSchema,
} from "../schemas/proyecto.schema.js";

const router = Router();

// El alta está en POST /colectivos/:id/proyectos, porque un proyecto
// no existe fuera de su colectivo.
router.get("/", proyectosController.listar);
router.get("/:id", proyectosController.obtenerPorId);
router.put("/:id", validate(actualizarProyectoSchema), proyectosController.actualizar);
router.patch("/:id/cierre", proyectosController.finalizar);

router.post(
  "/:id/habilidades",
  validate(agregarHabilidadSchema),
  proyectosController.agregarHabilidad,
);
router.delete("/:id/habilidades/:codigoHabilidad", proyectosController.quitarHabilidad);

router.post(
  "/:id/colaboraciones",
  validate(anotarColaboradorSchema),
  proyectosController.anotarColaborador,
);
router.get("/:id/colaboraciones", proyectosController.listarColaboraciones);

export default router;
