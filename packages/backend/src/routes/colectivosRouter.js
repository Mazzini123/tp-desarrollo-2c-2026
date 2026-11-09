import { Router } from "express";
import { validarBody, validarQuery } from "../middlewares/validar.js";
import {
  crearColectivoSchema,
  actualizarColectivoSchema,
} from "../schemas/colectivoSchema.js";
import { crearProyectoSchema } from "../schemas/proyectoSchema.js";
import { medioDeContactoSchema } from "../schemas/medioDeContactoSchema.js";
import { listadoConEtiquetaSchema } from "../schemas/comunesSchema.js";

export function crearColectivosRouter(
  colectivoController,
  estadisticaController,
  autorizacion,
) {
  const router = Router();

  router.post(
    "/",
    validarBody(crearColectivoSchema),
    autorizacion.sinPerfil,
    colectivoController.crear,
  );
  router.get("/", validarQuery(listadoConEtiquetaSchema), colectivoController.listar);
  router.get("/:id", colectivoController.obtenerPorId);
  router.put(
    "/:id",
    autorizacion.colectivoDe(),
    validarBody(actualizarColectivoSchema),
    colectivoController.actualizar,
  );
  // Req. adicional 23. Es una accion (como /finalizacion) y no un DELETE: el
  // colectivo sigue existiendo como historia, asi que GET /colectivos/:id
  // tiene que seguir respondiendo.
  router.post("/:id/baja", autorizacion.colectivoDe(), colectivoController.darDeBaja);

  router.post(
    "/:id/proyectos",
    autorizacion.colectivoDe(),
    validarBody(crearProyectoSchema),
    colectivoController.crearProyecto,
  );
  router.get("/:id/proyectos", colectivoController.listarProyectos);
  router.get("/:id/valoraciones", colectivoController.listarValoraciones);
  // Historial publico del colectivo (req. adicional 19).
  router.get("/:id/timeline", colectivoController.timeline);
  // Panel de la organizacion (req. adicional 17).
  router.get(
    "/:id/estadisticas",
    autorizacion.colectivoDe(),
    estadisticaController.deColectivo,
  );

  if (autorizacion.activa) {
    router.get(
      "/:id/medios-de-contacto",
      autorizacion.colectivoDe(),
      colectivoController.mediosDeContacto,
    );
    router.post(
      "/:id/medios-de-contacto",
      autorizacion.colectivoDe(),
      validarBody(medioDeContactoSchema),
      colectivoController.agregarMedioDeContacto,
    );
    router.delete(
      "/:id/medios-de-contacto/:tipo/:valor",
      autorizacion.colectivoDe(),
      colectivoController.quitarMedioDeContacto,
    );
  }

  return router;
}
