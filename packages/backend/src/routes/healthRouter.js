import { Router } from "express";
import { HealthController } from "../controllers/HealthController.js";

export function crearHealthRouter() {
  const router = Router();
  const healthController = new HealthController();

  router.get("/health", healthController.check);
  router.get("/ready", healthController.ready);

  return router;
}
