import { BadRequestError } from "../errors/BadRequestError.js";
import { objectIdSchema } from "../schemas/comunesSchema.js";

export const PARAMETROS_DE_ID = [
  "id",
  "perfilId",
  "colaboracionId",
  "colaboradorId",
  "solicitudId",
  "contextoId",
  "notificacionId",
  "logroId",
  "avanceId",
];

export function validarIdsDeRuta(router) {
  for (const nombre of PARAMETROS_DE_ID) {
    router.param(nombre, (_req, _res, next, valor) => {
      if (objectIdSchema.safeParse(valor).success) return next();
      next(new BadRequestError(`El parametro "${nombre}" no es un id valido`));
    });
  }
  return router;
}
