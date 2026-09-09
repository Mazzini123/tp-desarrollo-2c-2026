import { z } from "zod";
import { PERIODO_COMPROMISO } from "../domain/enums/PERIODO_COMPROMISO.js";
import { MODALIDAD_COLABORACION } from "../domain/enums/MODALIDAD_COLABORACION.js";

export const compromisoSchema = z
  .object({
    cantidadHoras: z.int().positive(),
    periodo: z.enum(Object.values(PERIODO_COMPROMISO)),
  })
  .strict();

export const modalidadColaboracionSchema = z.enum(
  Object.values(MODALIDAD_COLABORACION),
);

export const crearProyectoSchema = z
  .object({
    titulo: z.string().min(1),
    descripcion: z.string().min(1),
    compromisoEsperado: compromisoSchema,
    modalidadColaboracion: modalidadColaboracionSchema.default(
      MODALIDAD_COLABORACION.GRATUITA,
    ),
    habilidadesNecesarias: z.array(z.string().min(1)).min(1),
  })
  .strict();

export const actualizarProyectoSchema = z
  .object({
    titulo: z.string().min(1).optional(),
    descripcion: z.string().min(1).optional(),
  })
  .strict();

export const agregarHabilidadSchema = z
  .object({ codigoHabilidad: z.string().min(1) })
  .strict();

export const anotarColaboradorSchema = z
  .object({ colaboradorId: z.string().min(1) })
  .strict();

export const cambiarEstadoProyectoSchema = z
  .object({ estado: z.literal("finalizar") })
  .strict();
