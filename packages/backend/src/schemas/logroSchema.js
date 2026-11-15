import { z } from "zod";

const tituloSchema = z.string().trim().min(1).max(100);
const descripcionSchema = z.string().trim().min(1).max(1000);

export const crearLogroSchema = z
  .object({ titulo: tituloSchema, descripcion: descripcionSchema })
  .strict();

export const actualizarLogroSchema = z
  .object({ titulo: tituloSchema, descripcion: descripcionSchema })
  .strict();
