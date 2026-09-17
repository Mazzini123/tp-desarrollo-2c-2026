import { Router } from "express";
import { crearHealthRouter } from "./healthRouter.js";
import { crearColectivosRouter } from "./colectivosRouter.js";
import { crearProyectosRouter } from "./proyectosRouter.js";
import { crearHabilidadesRouter } from "./habilidadesRouter.js";
import { crearColaboradoresRouter } from "./colaboradoresRouter.js";

export function crearRouter(controllers) {
  const router = Router();

  router.use("/health", crearHealthRouter());
  router.use("/colectivos", crearColectivosRouter(controllers.colectivo));
  router.use("/proyectos", crearProyectosRouter(controllers.proyecto));
  router.use("/habilidades", crearHabilidadesRouter(controllers.habilidad));
  router.use("/colaboradores", crearColaboradoresRouter(controllers.colaborador));

  return router;
}
