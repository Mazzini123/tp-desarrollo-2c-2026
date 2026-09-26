import { z } from "zod";
import { tieneAlgunCampoDefinido } from "../utils/validaciones.js";

export const crearColaboradorSchema = z
  .object({
    nombreFantasia: z.string().trim().min(1).nullish(),
    nombre: z.string().trim().min(1).nullish(),
    apellido: z.string().trim().min(1).nullish(),
    cuentaGit: z.string().trim().min(1).nullish(),
    pronombres: z.array(z.string().trim().min(1)).default([]),
    presentacion: z.string().trim().min(1).nullish(),
    codigosHabilidades: z.array(z.string().trim().min(1)).default([]),
  })
  .strict();

export const actualizarColaboradorSchema = z
  .object({
    pronombres: z.array(z.string().trim().min(1)).optional(),
    presentacion: z.string().trim().min(1).nullish(),
  })
  .strict()
  .refine(tieneAlgunCampoDefinido, {
    message: "Se debe indicar al menos un campo para actualizar",
  });

export const agregarPronombreSchema = z
  .object({ pronombre: z.string().trim().min(1) })
  .strict();

export const agregarHabilidadColaboradorSchema = z
  .object({ codigoHabilidad: z.string().trim().min(1) })
  .strict();
