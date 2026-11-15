import { COLABORACION_ESTADO } from "../domain/enums/COLABORACION_ESTADO.js";
import { z } from "zod";

export const paginacionSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const listadoDeNotificacionesSchema = paginacionSchema.extend({
  leida: z
    .enum(["true", "false"])
    .transform((valor) => valor === "true")
    .optional(),
});

export const listadoDeColaboracionesSchema = paginacionSchema.extend({
  estado: z.enum(Object.values(COLABORACION_ESTADO)).optional(),
});
