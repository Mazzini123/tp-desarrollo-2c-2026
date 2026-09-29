import { z } from "zod";
import { crearPerfilSchema } from "./perfilSchema.js";
import { tieneAlgunCampoDefinido } from "../utils/validaciones.js";
import { etiquetasSchema } from "./comunesSchema.js";
import { MODO_ACEPTACION } from "../domain/enums/MODO_ACEPTACION.js";

const modoAceptacionSchema = z.enum(Object.values(MODO_ACEPTACION));
// null = sin limite de vacantes.
const limiteVacantesSchema = z.int().positive().nullable();

export const crearProyectoSchema = z
  .object({
    titulo: z.string().trim().min(1),
    descripcion: z.string().trim().min(1),
    perfiles: z.array(crearPerfilSchema).min(1),
    etiquetas: etiquetasSchema.default([]),
    modoAceptacion: modoAceptacionSchema.optional(),
    limiteVacantes: limiteVacantesSchema.optional(),
  })
  .strict();

export const actualizarProyectoSchema = z
  .object({
    titulo: z.string().trim().min(1).optional(),
    descripcion: z.string().trim().min(1).optional(),
    etiquetas: etiquetasSchema.optional(),
    modoAceptacion: modoAceptacionSchema.optional(),
    limiteVacantes: limiteVacantesSchema.optional(),
  })
  .strict()
  .refine(tieneAlgunCampoDefinido, {
    message: "Se debe indicar al menos un campo para actualizar",
  });

export const anotarColaboradorSchema = z
  .object({
    colaboradorId: z.string().trim().min(1),
    // false = contribucion anonima: figura en el proyecto, pero sin decir quien.
    esPublica: z.boolean().default(true),
  })
  .strict();
