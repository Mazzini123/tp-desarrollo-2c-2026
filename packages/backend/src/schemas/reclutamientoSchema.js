import { z } from "zod";
import { objectIdSchema } from "./comunesSchema.js";

export const invitacionSchema = z
  .object({
    colaboradorId: objectIdSchema,
    mensaje: z.string().trim().min(1).max(500).optional(),
  })
  .strict();
