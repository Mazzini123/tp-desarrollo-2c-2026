import { z } from "zod";

export const crearAvanceSchema = z
    .object({
        porcentajeConcrecion: z.number().min(0).max(100),
        urlSistema: z.string().trim().min(1),
        urlRepositorio: z.string().trim().min(1)
    })
    .strict();