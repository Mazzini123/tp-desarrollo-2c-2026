import { z } from "zod";
import { crearPerfilSchema } from "./perfilSchema.js";
import { tieneAlgunCampoDefinido } from "../utils/validaciones.js";
import {
  etiquetasSchema,
  fechaDeCierreSchema as fechaCierreSchema,
} from "./comunesSchema.js";

export const crearProyectoSchema = z
  .object({
    titulo: z.string().trim().min(1).max(100),
    descripcion: z.string().trim().min(1).max(5000),
    perfiles: z.array(crearPerfilSchema).min(1),
    etiquetas: etiquetasSchema.default([]),
    fechaCierre: fechaCierreSchema.optional(),
  })
  .strict();

export const actualizarProyectoSchema = z
  .object({
    titulo: z.string().trim().min(1).max(100).optional(),
    descripcion: z.string().trim().min(1).max(5000).optional(),
    etiquetas: etiquetasSchema.optional(),
    fechaCierre: fechaCierreSchema.optional(),
  })
  .strict()
  .refine(tieneAlgunCampoDefinido, {
    message: "Se debe indicar al menos un campo para actualizar",
  });

export const anotarColaboradorSchema = z
  .object({
    colaboradorId: z.string().trim().min(1),
    perfilId: z.string().trim().min(1),
    esPublica: z.boolean().default(true),
  })
  .strict();

export const publicacionHeadersSchema = z.looseObject({
  "idempotency-key": z.uuid().toLowerCase().optional(),
});
