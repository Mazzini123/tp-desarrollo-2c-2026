import { z } from "zod";
import { PERIODO_COMPROMISO } from "../domain/enums/PERIODO_COMPROMISO.js";
import { MODALIDAD_COLABORACION } from "../domain/enums/MODALIDAD_COLABORACION.js";
import { MODO_ACEPTACION } from "../domain/enums/MODO_ACEPTACION.js";
import { tieneAlgunCampoDefinido } from "../utils/validaciones.js";
import { fechaDeCierreSchema } from "./comunesSchema.js";

const modoAceptacionSchema = z.enum(Object.values(MODO_ACEPTACION));
const limiteColaboracionesSchema = z.int().positive().nullable();
const fechaCierreBusquedaSchema = fechaDeCierreSchema;

export const compromisoSchema = z
  .object({
    cantidadHoras: z.int().positive(),
    periodo: z.enum(Object.values(PERIODO_COMPROMISO)),
  })
  .strict();

export const modalidadColaboracionSchema = z.enum(Object.values(MODALIDAD_COLABORACION));

const tituloSchema = z.string().trim().min(1).max(80);

export const crearPerfilSchema = z
  .object({
    titulo: tituloSchema.optional(),
    descripcion: z.string().trim().min(1).max(1000),
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
    titulo: tituloSchema.optional(),
    descripcion: z.string().trim().min(1).max(1000).optional(),
    compromiso: compromisoSchema.optional(),
    modalidadColaboracion: modalidadColaboracionSchema.optional(),
    busquedaAbierta: z.boolean().optional(),
    fechaCierreBusqueda: fechaCierreBusquedaSchema.optional(),
    limiteColaboraciones: limiteColaboracionesSchema.optional(),
    modoAceptacion: modoAceptacionSchema.optional(),
    codigosHabilidadesRequeridas: z.array(z.string().trim().min(1)).min(1).optional(),
    codigosHabilidadesOpcionales: z.array(z.string().trim().min(1)).optional(),
    versionEdicion: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .strict()
  .refine(
    ({ versionEdicion: _versionEdicion, ...cambios }) => tieneAlgunCampoDefinido(cambios),
    {
      message: "Se debe indicar al menos un campo para actualizar",
    },
  );

export const agregarHabilidadPerfilSchema = z
  .object({ codigoHabilidad: z.string().trim().min(1) })
  .strict();
