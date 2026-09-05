import { z } from "zod";
import { TIPO_COLECTIVO } from "../domain/enums/TipoColectivo.js";
import { TIPO_UBICACION } from "../domain/enums/TipoUbicacion.js";

export const ubicacionSchema = z
  .object({
    tipoUbicacion: z.enum(Object.values(TIPO_UBICACION)),
    nombre: z.string().min(1).optional(),
  })
  .strict();

export const crearColectivoSchema = z
  .object({
    nombre: z.string().min(1),
    descripcion: z.string().min(1),
    tipoColectivo: z.enum(Object.values(TIPO_COLECTIVO)),
    ubicacion: ubicacionSchema.nullish(),
  })
  .strict();

// El tipo de colectivo no se puede cambiar en una edición.
export const actualizarColectivoSchema = z
  .object({
    nombre: z.string().min(1).optional(),
    descripcion: z.string().min(1).optional(),
    ubicacion: ubicacionSchema.nullish(),
  })
  .strict();
