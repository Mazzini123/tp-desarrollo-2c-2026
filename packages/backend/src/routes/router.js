import { Router } from "express";
import { crearHealthRouter } from "./healthRouter.js";
import { crearColectivosRouter } from "./colectivosRouter.js";
import { crearProyectosRouter } from "./proyectosRouter.js";
import { crearHabilidadesRouter } from "./habilidadesRouter.js";
import { crearColaboradoresRouter } from "./colaboradoresRouter.js";
import { crearEstadisticasRouter } from "./estadisticasRouter.js";
import { crearCatalogosRouter } from "./catalogosRouter.js";
import { crearCuentaRouter } from "./cuentaRouter.js";
import { autorizacionDesactivada } from "../middlewares/autorizacion.js";

export function crearRouter(controllers, autorizacion = autorizacionDesactivada()) {
  const router = Router();

  router.use(crearHealthRouter());
  router.use(autorizacion.autenticar);
  router.use("/colectivos", crearColectivosRouter(controllers, autorizacion));
  router.use("/catalogos", crearCatalogosRouter());
  router.use("/estadisticas", crearEstadisticasRouter(controllers.estadistica));
  router.use("/proyectos", crearProyectosRouter(controllers, autorizacion));
  router.use("/habilidades", crearHabilidadesRouter(controllers.habilidad));
  router.use("/colaboradores", crearColaboradoresRouter(controllers, autorizacion));
  router.use("/auth", crearCuentaRouter(controllers.cuenta, autorizacion));

  return router;
}
