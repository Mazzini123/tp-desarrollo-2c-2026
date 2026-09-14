import { Router } from "express";
import { validarBody, validarQuery } from "../middlewares/validar.js";
import { paginacionSchema } from "../schemas/paginacionSchema.js";
import {
  actualizarProyectoSchema,
  agregarHabilidadSchema,
  anotarColaboradorSchema,
} from "../schemas/proyectoSchema.js";

export function crearProyectosRouter(proyectoController) {
  const router = Router();

  router.get("/", validarQuery(paginacionSchema), proyectoController.listar);
  router.get("/:id", proyectoController.obtenerPorId);
  router.put("/:id", validarBody(actualizarProyectoSchema), proyectoController.actualizar);

  // Correccion E1: se crea la finalizacion del proyecto como sub-recurso,
  // en vez de PATCH /:id con { estado: "finalizar" }.
  router.post("/:id/finalizacion", proyectoController.finalizar);

  router.post(
    "/:id/habilidades",
    validarBody(agregarHabilidadSchema),
    proyectoController.agregarHabilidad,
  );
  router.delete("/:id/habilidades/:codigoHabilidad", proyectoController.quitarHabilidad);

  router.post(
    "/:id/colaboraciones",
    validarBody(anotarColaboradorSchema),
    proyectoController.anotarColaborador,
  );
  router.get("/:id/colaboraciones", proyectoController.listarColaboraciones);

  return router;
}
