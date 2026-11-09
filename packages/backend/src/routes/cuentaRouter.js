import { Router } from "express";

export function crearCuentaRouter(cuentaController, autorizacion) {
  const router = Router();

  router.get("/me", autorizacion.sesion, cuentaController.yo);

  return router;
}
