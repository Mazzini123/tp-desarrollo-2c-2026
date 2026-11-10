import mongoose from "mongoose";
import { Habilidad } from "../domain/Habilidad.js";
import { MedioDeContacto } from "../domain/MedioDeContacto.js";
import { Ubicacion } from "../domain/Ubicacion.js";

export const DE_VALOR = { _id: false, id: false };

export const redSocialSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    url: { type: String, required: true },
  },
  DE_VALOR,
);

export const medioDeContactoSchema = new mongoose.Schema(
  {
    tipo: { type: String, required: true },
    valor: { type: String, required: true },
  },
  DE_VALOR,
);
medioDeContactoSchema.loadClass(MedioDeContacto);

export const habilidadEmbebidaSchema = new mongoose.Schema(
  {
    codigo: { type: String, required: true },
    titulo: { type: String, required: true },
  },
  DE_VALOR,
);
habilidadEmbebidaSchema.loadClass(Habilidad);

export const ubicacionSchema = new mongoose.Schema(
  {
    tipoUbicacion: { type: String, required: true },
    nombre: { type: String, default: null },
  },
  DE_VALOR,
);
ubicacionSchema.loadClass(Ubicacion);
