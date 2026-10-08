import { z } from "zod";
import { crearPerfilSchema } from "./perfilSchema.js";
import { tieneAlgunCampoDefinido } from "../utils/validaciones.js";
import { etiquetasSchema } from "./comunesSchema.js";
import { MODO_ACEPTACION } from "../domain/enums/MODO_ACEPTACION.js";

const modoAceptacionSchema = z.enum(Object.values(MODO_ACEPTACION));
// null = sin limite de vacantes.
const limiteVacantesSchema = z.int().positive().nullable();
// Fecha ISO ("2026-12-01" o "2026-12-01T18:00:00-03:00"); null la saca.
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
    modoAceptacion: modoAceptacionSchema.optional(),
    limiteVacantes: limiteVacantesSchema.optional(),
    fechaCierre: fechaCierreSchema.optional(),
  })
  .strict();

export const actualizarProyectoSchema = z
  .object({
    titulo: z.string().trim().min(1).optional(),
    descripcion: z.string().trim().min(1).optional(),
    etiquetas: etiquetasSchema.optional(),
    modoAceptacion: modoAceptacionSchema.optional(),
    limiteVacantes: limiteVacantesSchema.optional(),
    fechaCierre: fechaCierreSchema.optional(),
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
