import { z } from "zod";

export const crearHabilidadSchema = z
  .object({
    titulo: z.string().min(1),
    descripcion: z.string().default(""),
    usuario: z.string().min(1).optional(),
  })
  .strict();
