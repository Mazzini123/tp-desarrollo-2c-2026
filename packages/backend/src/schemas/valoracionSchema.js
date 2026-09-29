import { z } from "zod";
import { AUTOR_VALORACION } from "../domain/enums/AUTOR_VALORACION.js";

export const valoracionSchema = z
  .object({
    autor: z.enum(Object.values(AUTOR_VALORACION)),
    puntaje: z.int().min(1).max(5),
    // "puntaje + comentario breve"
    comentario: z.string().trim().min(1).max(280).optional(),
  })
  .strict();
