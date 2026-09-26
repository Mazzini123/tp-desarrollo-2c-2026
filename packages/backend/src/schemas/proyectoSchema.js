import { z } from "zod";
import { crearPerfilSchema } from "./perfilSchema.js";
import { tieneAlgunCampoDefinido } from "../utils/validaciones.js";

export const crearProyectoSchema = z
  .object({
    titulo: z.string().trim().min(1),
    descripcion: z.string().trim().min(1),
    perfiles: z.array(crearPerfilSchema).min(1),
  })
  .strict();

export const actualizarProyectoSchema = z
  .object({
    titulo: z.string().trim().min(1).optional(),
    descripcion: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine(tieneAlgunCampoDefinido, {
    message: "Se debe indicar al menos un campo para actualizar",
  });

export const anotarColaboradorSchema = z
  .object({ colaboradorId: z.string().trim().min(1) })
  .strict();
