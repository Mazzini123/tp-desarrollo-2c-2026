import { z } from "zod";

export const crearColaboradorSchema = z
  .object({
    nombreFantasia: z.string().min(1).nullish(),
    nombre: z.string().min(1).nullish(),
    apellido: z.string().min(1).nullish(),
    cuentaGit: z.string().min(1).nullish(),
    pronombres: z.array(z.string()).default([]),
    presentacion: z.string().nullish(),
    habilidades: z.array(z.string().min(1)).default([]),
  })
  .strict();
// La regla "debe tener al menos un dato de identificación" no se
// valida acá: no es forma, es negocio, y vive en el constructor de
// Colaborador.

export const actualizarColaboradorSchema = z
  .object({
    pronombres: z.array(z.string()).optional(),
    presentacion: z.string().nullish(),
  })
  .strict();
