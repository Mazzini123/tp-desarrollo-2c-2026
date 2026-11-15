import mongoose from "mongoose";
import { aplicarFormatoJSON } from "../../models/formatoJSON.js";

const ObjectId = mongoose.Schema.Types.ObjectId;

const usuarioSchema = new mongoose.Schema(
  {
    identidadExternaId: {
      type: ObjectId,
      ref: "IdentidadExterna",
      required: true,
      unique: true,
      immutable: true,
    },
    contextoActualId: { type: ObjectId, ref: "ContextoUsuario", default: null },
    nombre: { type: String, trim: true, maxlength: 80, default: null },
    fechaAlta: { type: Date, default: Date.now },
    versionContextos: { type: Number, default: 0 },
  },
  { collection: "usuarios" },
);
aplicarFormatoJSON(usuarioSchema, {
  campos: ["id", "identidadExternaId", "contextoActualId", "nombre", "fechaAlta"],
});

export const UsuarioModel = mongoose.model("Usuario", usuarioSchema);
