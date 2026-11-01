import mongoose from "mongoose";
import { Habilidad, normalizarASnakeCase } from "../domain/Habilidad.js";
import { aplicarFormatoJSON } from "./formatoJSON.js";

// Una sola abstraccion: el schema dice COMO SE GUARDA y loadClass le suma lo
// que la habilidad SABE HACER (los metodos de la clase Habilidad).
const habilidadSchema = new mongoose.Schema({
  // _id: no se declara. Mongoose genera un ObjectId.
  titulo: { type: String, required: true },
  // Clave de dominio: unica y aparte del _id. Se busca por este campo.
  codigo: {
    type: String,
    required: true,
    unique: true,
    // Un default puede leer otros campos con `this`: el codigo se deriva del
    // titulo ("Desarrollo Node" -> "desarrollo_node").
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

// Hacia afuera, una habilidad se identifica por su codigo: el id no se muestra.
aplicarFormatoJSON(habilidadSchema, { ocultar: ["id"] });

export const HabilidadModel = mongoose.model("Habilidad", habilidadSchema);
