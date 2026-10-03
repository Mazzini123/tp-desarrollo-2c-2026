import { z } from "zod";

export const crearLogroSchema = z
  .object({
    titulo: z.string().trim().min(1),
    descripcion: z.string().trim().min(1)
  })
  .strict();

export const actualizarLogroSchema = z
  .object({
    titulo: z.string().trim().min(1),
    descripcion: z.string().trim().min(1)
  })
  .strict();