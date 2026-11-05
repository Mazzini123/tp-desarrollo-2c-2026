import { z } from "zod";
import { PERIODO_COMPROMISO } from "../domain/enums/PERIODO_COMPROMISO.js";
import { MODALIDAD_COLABORACION } from "../domain/enums/MODALIDAD_COLABORACION.js";
import { MODO_ACEPTACION } from "../domain/enums/MODO_ACEPTACION.js";
import { tieneAlgunCampoDefinido } from "../utils/validaciones.js";

const modoAceptacionSchema = z.enum(Object.values(MODO_ACEPTACION));
const limiteColaboracionesSchema = z.int().positive().nullable();
const fechaCierreBusquedaSchema = z
  .union([z.iso.datetime({ offset: true }), z.iso.date()])
  .transform((texto) => new Date(texto))
  .nullable();

export const compromisoSchema = z
  .object({
    cantidadHoras: z.int().positive(),
    periodo: z.enum(Object.values(PERIODO_COMPROMISO)),
  })
  .strict();

export const modalidadColaboracionSchema = z.enum(Object.values(MODALIDAD_COLABORACION));

export const crearPerfilSchema = z
  .object({
    descripcion: z.string().trim().min(1),
    codigosHabilidadesRequeridas: z.array(z.string().trim().min(1)).min(1),
    codigosHabilidadesOpcionales: z.array(z.string().trim().min(1)).default([]),
    compromiso: compromisoSchema,
    modalidadColaboracion: modalidadColaboracionSchema.default(
      MODALIDAD_COLABORACION.GRATUITA,
    ),
    busquedaAbierta: z.boolean().default(true),
    fechaCierreBusqueda: fechaCierreBusquedaSchema.optional(),
    limiteColaboraciones: limiteColaboracionesSchema.optional(),
    modoAceptacion: modoAceptacionSchema.optional(),
  })
  .strict();

export const actualizarPerfilSchema = z
  .object({
    descripcion: z.string().trim().min(1).optional(),
    compromiso: compromisoSchema.optional(),
    modalidadColaboracion: modalidadColaboracionSchema.optional(),
    busquedaAbierta: z.boolean().optional(),
    fechaCierreBusqueda: fechaCierreBusquedaSchema.optional(),
    limiteColaboraciones: limiteColaboracionesSchema.optional(),
    modoAceptacion: modoAceptacionSchema.optional(),
  })
  .strict()
  .refine(tieneAlgunCampoDefinido, {
    message: "Se debe indicar al menos un campo para actualizar",
  });

export const agregarHabilidadPerfilSchema = z
  .object({ codigoHabilidad: z.string().trim().min(1) })
  .strict();
