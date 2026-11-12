import mongoose from "mongoose";
import { Colectivo } from "../domain/Colectivo.js";
import {
  medioDeContactoSchema,
  redSocialSchema,
  ubicacionSchema,
} from "./subesquemas.js";
import { aplicarFormatoJSON } from "./formatoJSON.js";

const colectivoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    descripcion: { type: String, required: true },
    tipoColectivo: { type: String, required: true },
    ubicacion: { type: ubicacionSchema, default: null },
    redesSociales: { type: [redSocialSchema], default: [] },
    etiquetas: { type: [String], default: [] },
    mediosDeContacto: { type: [medioDeContactoSchema], default: [] },
    fechaAlta: { type: Date, default: Date.now },
    fechaBaja: { type: Date, default: null },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  },
);
colectivoSchema.loadClass(Colectivo);
aplicarFormatoJSON(colectivoSchema, {
  campos: [
    "id",
    "nombre",
    "descripcion",
    "tipoColectivo",
    "ubicacion",
    "redesSociales",
    "etiquetas",
    "fechaAlta",
    "fechaBaja",
  ],
});
colectivoSchema.index({ etiquetas: 1 });

export const ColectivoModel = mongoose.model("Colectivo", colectivoSchema);
