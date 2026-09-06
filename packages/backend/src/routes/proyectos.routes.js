import { Router } from "express";
import { ProyectoController } from "../controllers/ProyectoController.js";
import { validate } from "../middlewares/validate.js";
import {
  actualizarProyectoSchema,
  agregarHabilidadSchema,
  anotarColaboradorSchema,
} from "../schemas/proyecto.schema.js";

const router = Router();
const proyectoController = new ProyectoController();

// El alta está en POST /colectivos/:id/proyectos.
router.get("/", proyectoController.listar);
router.get("/:id", proyectoController.obtenerPorId);
router.put("/:id", validate(actualizarProyectoSchema), proyectoController.actualizar);
router.patch("/:id/cierre", proyectoController.finalizar);

router.post("/:id/habilidades", validate(agregarHabilidadSchema), proyectoController.agregarHabilidad);
router.delete("/:id/habilidades/:codigoHabilidad", proyectoController.quitarHabilidad);

router.post(
  "/:id/colaboraciones",
  validate(anotarColaboradorSchema),
  proyectoController.anotarColaborador,
);
router.get("/:id/colaboraciones", proyectoController.listarColaboraciones);

export default router;
