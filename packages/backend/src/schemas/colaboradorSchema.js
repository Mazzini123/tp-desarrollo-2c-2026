import { z } from "zod";

export const crearColaboradorSchema = z
  .object({
    nombreFantasia: z.string().min(1).nullish(),
    nombre: z.string().min(1).nullish(),
    apellido: z.string().min(1).nullish(),
    cuentaGit: z.string().min(1).nullish(),
    pronombres: z.array(z.string()).default([]),
    presentacion: z.string().nullish(),
    codigosHabilidades: z.array(z.string().min(1)).default([]),
  })
  .strict();

export const actualizarColaboradorSchema = z
  .object({
    pronombres: z.array(z.string()).optional(),
    presentacion: z.string().nullish(),
  })
  .strict();
