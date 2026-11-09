import { z } from "zod";
import { tieneAlgunCampoDefinido } from "../utils/validaciones.js";
import { mediosDeContactoSchema } from "./medioDeContactoSchema.js";
import { redesSocialesSchema } from "./comunesSchema.js";

const cuentaGitSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z\d](?:[a-zA-Z\d]|-(?=[a-zA-Z\d])){0,38}$/, "Usuario de Git invalido");
const pronombreSchema = z.string().trim().min(1).max(20);

export const crearColaboradorSchema = z
  .object({
    nombreFantasia: z.string().trim().min(1).max(50).nullish(),
    nombre: z.string().trim().min(1).max(50).nullish(),
    apellido: z.string().trim().min(1).max(50).nullish(),
    cuentaGit: cuentaGitSchema.nullish(),
    pronombres: z.array(pronombreSchema).default([]),
    presentacion: z.string().trim().min(1).max(1000).nullish(),
    codigosHabilidades: z.array(z.string().trim().min(1)).default([]),
    recibeMensajeriaInterna: z.boolean().optional(),
    mediosDeContacto: mediosDeContactoSchema.default([]),
    redesSociales: redesSocialesSchema.default([]),
  })
  .strict();

export const actualizarColaboradorSchema = z
  .object({
    pronombres: z.array(pronombreSchema).optional(),
    presentacion: z.string().trim().min(1).max(1000).nullish(),
    recibeMensajeriaInterna: z.boolean().optional(),
    redesSociales: redesSocialesSchema.optional(),
  })
  .strict()
  .refine(tieneAlgunCampoDefinido, {
    message: "Se debe indicar al menos un campo para actualizar",
  });

export const agregarPronombreSchema = z
  .object({ pronombre: pronombreSchema })
  .strict();

export const agregarHabilidadColaboradorSchema = z
  .object({ codigoHabilidad: z.string().trim().min(1) })
  .strict();
