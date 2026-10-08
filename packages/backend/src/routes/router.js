import { Router } from "express";
import { crearHealthRouter } from "./healthRouter.js";
import { crearColectivosRouter } from "./colectivosRouter.js";
import { crearProyectosRouter } from "./proyectosRouter.js";
import { crearHabilidadesRouter } from "./habilidadesRouter.js";
import { crearColaboradoresRouter } from "./colaboradoresRouter.js";
import { crearEstadisticasRouter } from "./estadisticasRouter.js";

export function crearRouter(controllers) {
  const router = Router();

  router.use("/health", crearHealthRouter());
  router.use(
    "/colectivos",
    crearColectivosRouter(controllers.colectivo, controllers.estadistica),
  );
  router.use("/estadisticas", crearEstadisticasRouter(controllers.estadistica));
  router.use(
    "/proyectos",
    crearProyectosRouter(
      controllers.proyecto,
      controllers.perfil,
      controllers.reclutamiento,
      controllers.postulacion,
      controllers.logro,
      controllers.avance
    ),
  );
  router.use("/habilidades", crearHabilidadesRouter(controllers.habilidad));
  router.use(
    "/colaboradores",
    crearColaboradoresRouter(
      controllers.colaborador,
      controllers.notificacion,
      controllers.reclutamiento,
    ),
  );

  return router;
}
