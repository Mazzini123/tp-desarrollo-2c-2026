import { z } from "zod";

export const invitacionSchema = z
  .object({
    colaboradorId: z.string().trim().min(1),
    mensaje: z.string().trim().min(1).max(500).optional(),
  })
  .strict();
