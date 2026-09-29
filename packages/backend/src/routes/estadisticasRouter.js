import { Router } from "express";

export function crearEstadisticasRouter(estadisticaController) {
  const router = Router();

  router.get("/", estadisticaController.globales);

  return router;
}
