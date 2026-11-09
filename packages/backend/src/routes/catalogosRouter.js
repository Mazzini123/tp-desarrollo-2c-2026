import { Router } from "express";
import { PROVINCIAS } from "../domain/Ubicacion.js";

export function crearCatalogosRouter() {
  const router = Router();

  router.get("/provincias", (_req, res) => {
    res.status(200).json(PROVINCIAS);
  });

  return router;
}
