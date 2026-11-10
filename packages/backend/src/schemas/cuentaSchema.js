import { z } from "zod";
import { ESTADO_SOLICITUD } from "../security/application/ESTADO_SOLICITUD.js";
import { objectIdSchema } from "./comunesSchema.js";

export const registroSchema = z.preprocess(
  (cuerpo) => cuerpo ?? {},
  z.object({}).strict(),
);

export const nombreDeUsuarioSchema = z
  .object({ nombre: z.string().trim().min(1).max(80) })
  .strict();

export const seleccionarContextoSchema = z
  .object({ contextoId: z.string().trim().min(1) })
  .strict();

export const transferirLiderazgoSchema = z
  .object({ contextoId: objectIdSchema })
  .strict();

export const listadoDeSolicitudesSchema = z
  .object({ estado: z.enum(Object.values(ESTADO_SOLICITUD)).optional() })
  .strict();
