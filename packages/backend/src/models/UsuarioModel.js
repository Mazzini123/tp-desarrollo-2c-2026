import mongoose from "mongoose";
import { aplicarFormatoJSON } from "./formatoJSON.js";

const usuarioSchema = new mongoose.Schema(
  {
    contextoActualId: { type: mongoose.Schema.Types.ObjectId, default: null },
    nombre: { type: String, trim: true, maxlength: 80, default: null },
    fechaAlta: { type: Date, default: Date.now },
    contextosActualizadosEn: { type: Date, default: null },
  },
  { collection: "usuarios" },
);
aplicarFormatoJSON(usuarioSchema, {
  campos: ["id", "contextoActualId", "nombre", "fechaAlta"],
});

export const UsuarioModel = mongoose.model("Usuario", usuarioSchema);
