import { z } from "zod";

export const crearHabilidadSchema = z
  .object({
    titulo: z.string().trim().min(1),
    descripcion: z.string().trim().default(""),
    usuario: z.string().trim().min(1).optional(),
  })
  .strict();
