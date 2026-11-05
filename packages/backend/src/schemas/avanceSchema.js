import { z } from "zod";

const enlaceSchema = z.url({ protocol: /^https?$/ });

export const crearAvanceSchema = z
  .object({
    porcentajeConcrecion: z.number().min(0).max(100),
    urlSistema: enlaceSchema,
    urlRepositorio: enlaceSchema,
  })
  .strict();
