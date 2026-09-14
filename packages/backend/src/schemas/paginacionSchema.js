import { z } from "zod";

/**
 * Reemplaza a `BaseController.extraerPaginacion` y `validarEnteroPositivo`,
 * que hacian a mano la conversion y la validacion que Zod ya sabe hacer.
 *
 * `coerce` porque todo lo que llega por query string es string.
 * `max(100)` tapa un agujero que tenia la version anterior: `?limit=999999`
 * pasaba la validacion sin problema.
 */
export const paginacionSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});
