import { Router } from "express";
import { crearHealthRouter } from "./healthRouter.js";
import { crearColectivosRouter } from "./colectivosRouter.js";
import { crearProyectosRouter } from "./proyectosRouter.js";
import { crearHabilidadesRouter } from "./habilidadesRouter.js";
import { crearColaboradoresRouter } from "./colaboradoresRouter.js";

/**
 * Router raiz: delega por prefijo. Sigue teniendo la misma responsabilidad que
 * defendimos en el coloquio — cambiar la ruta de un recurso se hace tocando
 * una sola linea de este archivo.
 *
 * Lo que cambio (correccion B1) es que ahora recibe los controllers ya
 * construidos en vez de que cada sub-router se arme el suyo.
 */
export function crearRouter(controllers) {
  const router = Router();

  router.use("/health", crearHealthRouter());
  router.use("/colectivos", crearColectivosRouter(controllers.colectivo));
  router.use("/proyectos", crearProyectosRouter(controllers.proyecto));
  router.use("/habilidades", crearHabilidadesRouter(controllers.habilidad));
  router.use("/colaboradores", crearColaboradoresRouter(controllers.colaborador));

  return router;
}
