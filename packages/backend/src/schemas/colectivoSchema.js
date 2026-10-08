import { z } from "zod";
import { TIPO_COLECTIVO } from "../domain/enums/TIPO_COLECTIVO.js";
import { TIPO_UBICACION } from "../domain/enums/TIPO_UBICACION.js";
import { tieneAlgunCampoDefinido } from "../utils/validaciones.js";
import { redesSocialesSchema, etiquetasSchema } from "./comunesSchema.js";
import { mediosDeContactoSchema } from "./medioDeContactoSchema.js";

export const ubicacionSchema = z
  .object({
    tipoUbicacion: z.enum(Object.values(TIPO_UBICACION)),
    nombre: z.string().trim().min(1).optional(),
  })
  .strict();

export const crearColectivoSchema = z
  .object({
    nombre: z.string().trim().min(1),
    descripcion: z.string().trim().min(1),
    tipoColectivo: z.enum(Object.values(TIPO_COLECTIVO)),
    ubicacion: ubicacionSchema.nullish(),
    redesSociales: redesSocialesSchema.default([]),
    etiquetas: etiquetasSchema.default([]),
    mediosDeContacto: mediosDeContactoSchema.default([]),
  })
  .strict();

export const actualizarColectivoSchema = z
  .object({
    nombre: z.string().trim().min(1).optional(),
    descripcion: z.string().trim().min(1).optional(),
    ubicacion: ubicacionSchema.nullish(),
    redesSociales: redesSocialesSchema.optional(),
    etiquetas: etiquetasSchema.optional(),
    mediosDeContacto: mediosDeContactoSchema.optional(),
  })
  .strict()
  .refine(tieneAlgunCampoDefinido, {
    message: "Se debe indicar al menos un campo para actualizar",
  });
