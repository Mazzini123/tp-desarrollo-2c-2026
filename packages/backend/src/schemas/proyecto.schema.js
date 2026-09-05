import { z } from "zod";
import { PERIODO_COMPROMISO } from "../domain/enums/PeriodoCompromiso.js";

export const compromisoSchema = z
  .object({
    cantidadHoras: z.int().positive(),
    periodo: z.enum(Object.values(PERIODO_COMPROMISO)),
  })
  .strict();

export const modalidadColaboracionSchema = z
  .object({
    ofreceIncentivoEconomico: z.boolean().optional(),
    posibilidadDeContratacion: z.boolean().optional(),
  })
  .strict();

export const crearProyectoSchema = z
  .object({
    titulo: z.string().min(1),
    descripcion: z.string().min(1),
    compromisoEsperado: compromisoSchema,
    modalidadColaboracion: modalidadColaboracionSchema.default({}),
    // Al menos una habilidad: el enunciado lo exige y la cátedra lo confirmó.
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
