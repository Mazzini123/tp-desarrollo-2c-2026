import { z } from "zod";
import { paginacionSchema } from "./paginacionSchema.js";
import { normalizarEtiqueta } from "../domain/etiquetas.js";
import { PROYECTO_ESTADO } from "../domain/enums/PROYECTO_ESTADO.js";
import { TIPO_COLECTIVO } from "../domain/enums/TIPO_COLECTIVO.js";
import { MODALIDAD_COLABORACION } from "../domain/enums/MODALIDAD_COLABORACION.js";

const FIN_DEL_DIA_ARGENTINA = "T23:59:59.999-03:00";

export const fechaDeCierreSchema = z
  .union([z.iso.datetime({ offset: true }), z.iso.date()])
  .transform((texto) => new Date(texto.length === 10 ? texto + FIN_DEL_DIA_ARGENTINA : texto))
  .nullable();

export const redSocialSchema = z
  .object({
    nombre: z.string().trim().min(1).max(40),
    url: z.url({ protocol: /^https?$/ }),
  })
  .strict();

export const redesSocialesSchema = z.array(redSocialSchema).max(10);

export const etiquetasSchema = z.array(z.string().trim().min(1).max(30)).max(10);

export const listadoDeProyectosSchema = paginacionSchema.extend({
  etiqueta: z.string().trim().min(1).transform(normalizarEtiqueta).optional(),
  estado: z.enum(Object.values(PROYECTO_ESTADO)).optional(),
  habilidad: z.string().trim().min(1).optional(),
  tipoColectivo: z.enum(Object.values(TIPO_COLECTIVO)).optional(),
  ubicacion: z.string().trim().min(1).optional(),
  modalidad: z.enum(Object.values(MODALIDAD_COLABORACION)).optional(),
});

export const listadoConEtiquetaSchema = paginacionSchema.extend({
  etiqueta: z.string().trim().min(1).transform(normalizarEtiqueta).optional(),
});
