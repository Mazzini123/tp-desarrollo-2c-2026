import mongoose from "mongoose";

// Este schema describe COMO SE GUARDA, no el dominio.
// El dominio sigue siendo la clase Habilidad.
const habilidadSchema = new mongoose.Schema(
  {
    // Usamos el codigo como _id: es la clave natural de la habilidad
    // y evita tener dos identificadores para lo mismo.
    _id: { type: String },
    titulo: { type: String, required: true },
    descripcion: { type: String, default: "" },
    fechaCreacion: { type: Date, default: Date.now },
    usuario: { type: String, default: "admin" },
    activo: { type: Boolean, default: true },
  },
  { versionKey: false }, // sin el campo __v que agrega mongoose
);

export const HabilidadModel = mongoose.model("Habilidad", habilidadSchema);