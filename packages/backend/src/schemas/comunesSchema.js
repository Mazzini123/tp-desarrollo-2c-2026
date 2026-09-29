import { z } from "zod";
import { paginacionSchema } from "./paginacionSchema.js";
import { normalizarEtiqueta } from "../domain/etiquetas.js";

// Solo http y https: un "javascript:..." guardado como link seria un XSS
// esperando a que alguien lo clickee en el frontend.
export const redSocialSchema = z
  .object({
    nombre: z.string().trim().min(1).max(40),
    url: z.url({ protocol: /^https?$/ }),
  })
  .strict();

export const redesSocialesSchema = z.array(redSocialSchema).max(10);

export const etiquetasSchema = z.array(z.string().trim().min(1).max(30)).max(10);

// Los listados que se pueden filtrar por etiqueta: ?etiqueta=salud
export const listadoConEtiquetaSchema = paginacionSchema.extend({
  etiqueta: z.string().trim().min(1).transform(normalizarEtiqueta).optional(),
});
