import mongoose from "mongoose";
import { Habilidad, normalizarASnakeCase } from "../domain/Habilidad.js";
import { aplicarFormatoJSON } from "./formatoJSON.js";

const habilidadSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  codigo: {
    type: String,
    required: true,
    unique: true,
    default() {
      return this.titulo ? normalizarASnakeCase(this.titulo) : undefined;
    },
  },
  descripcion: { type: String, default: "" },
  fechaCreacion: { type: Date, default: Date.now },
  usuario: { type: String, default: "admin" },
  activo: { type: Boolean, default: true },
});

habilidadSchema.loadClass(Habilidad);

aplicarFormatoJSON(habilidadSchema, {
  campos: ["codigo", "titulo", "descripcion", "fechaCreacion", "usuario", "activo"],
});

export const HabilidadModel = mongoose.model("Habilidad", habilidadSchema);
