import { Router } from "express";

export function crearTerminosRouter(controller) {
  const router = Router();
  router.get("/", controller.vigente);
  return router;
}
