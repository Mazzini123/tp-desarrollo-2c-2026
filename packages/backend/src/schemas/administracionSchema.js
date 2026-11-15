import { z } from "zod";
import {
  ACCION_ADMINISTRATIVA,
  TIPO_ENTIDAD_AUDITADA,
} from "../domain/enums/ACCION_ADMINISTRATIVA.js";
import {
  ESTADO_REVISION,
  ESTADOS_FINALES_DE_REVISION,
} from "../domain/enums/ESTADO_REVISION.js";
import { MOTIVO_REVISION } from "../domain/enums/MOTIVO_REVISION.js";
import { fechaDeCierreSchema, objectIdSchema } from "./comunesSchema.js";
import { paginacionSchema } from "./paginacionSchema.js";

export const destacarProyectoSchema = z
  .object({ hasta: fechaDeCierreSchema.unwrap() })
  .strict();

export const resolverRevisionSchema = z
  .object({
    estado: z.enum(ESTADOS_FINALES_DE_REVISION),
    nota: z.string().trim().max(1000).optional(),
  })
  .strict();

export const otorgarAdministradorSchema = z
  .object({ usuarioId: objectIdSchema })
  .strict();

export const listadoDeRevisionesSchema = paginacionSchema.extend({
  estado: z.enum(Object.values(ESTADO_REVISION)).optional(),
  motivo: z.enum(Object.values(MOTIVO_REVISION)).optional(),
});

export const listadoDeAuditoriaSchema = paginacionSchema.extend({
  accion: z.enum(Object.values(ACCION_ADMINISTRATIVA)).optional(),
  entidadTipo: z.enum(Object.values(TIPO_ENTIDAD_AUDITADA)).optional(),
  entidadId: objectIdSchema.optional(),
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
});
