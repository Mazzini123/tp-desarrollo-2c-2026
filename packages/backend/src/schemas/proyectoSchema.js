import { z } from "zod";
import { crearPerfilSchema } from "./perfilSchema.js";
import { tieneAlgunCampoDefinido } from "../utils/validaciones.js";
import { etiquetasSchema } from "./comunesSchema.js";

const fechaCierreSchema = z
  .union([z.iso.datetime({ offset: true }), z.iso.date()])
  .transform((texto) => new Date(texto))
  .nullable();

export const crearProyectoSchema = z
  .object({
    titulo: z.string().trim().min(1),
    descripcion: z.string().trim().min(1),
    perfiles: z.array(crearPerfilSchema).min(1),
    etiquetas: etiquetasSchema.default([]),
    fechaCierre: fechaCierreSchema.optional(),
  })
  .strict();

export const actualizarProyectoSchema = z
  .object({
    titulo: z.string().trim().min(1).optional(),
    descripcion: z.string().trim().min(1).optional(),
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
