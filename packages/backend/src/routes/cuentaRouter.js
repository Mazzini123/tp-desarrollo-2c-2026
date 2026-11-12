import { Router } from "express";
import { validarBody } from "../middlewares/validar.js";
import {
  nombreDeUsuarioSchema,
  registroSchema,
  seleccionarContextoSchema,
} from "../schemas/cuentaSchema.js";

export function crearCuentaRouter(cuentaController, autorizacion) {
  const router = Router();

  router.post(
    "/registro",
    autorizacion.exigirAutenticacion,
    validarBody(registroSchema),
    cuentaController.registrar,
  );
  router.get("/me", autorizacion.usuario(), cuentaController.yo);

  router.put(
    "/usuario",
    autorizacion.soloConAutenticacion,
    autorizacion.usuario(),
    validarBody(nombreDeUsuarioSchema),
    cuentaController.cambiarNombre,
  );
  router.put(
    "/contexto-actual",
    autorizacion.soloConAutenticacion,
    autorizacion.usuario(),
    validarBody(seleccionarContextoSchema),
    cuentaController.seleccionarContexto,
  );
  router.delete(
    "/contexto-actual",
    autorizacion.soloConAutenticacion,
    autorizacion.usuario(),
    cuentaController.limpiarContexto,
  );
  router.get(
    "/solicitudes-ingreso",
    autorizacion.soloConAutenticacion,
    autorizacion.usuario(),
    cuentaController.misSolicitudes,
  );

  return router;
}
