import mongoose from "mongoose";
import { aplicarFormatoJSON } from "../../models/formatoJSON.js";

const identidadExternaSchema = new mongoose.Schema(
  {
    proveedor: { type: String, required: true },
    sub: { type: String, required: true },
    usuarioId: { type: mongoose.Schema.Types.ObjectId, required: true },
    fechaAlta: { type: Date, default: Date.now },
  },
  { collection: "identidadesExternas" },
);
aplicarFormatoJSON(identidadExternaSchema, {
  campos: ["id", "proveedor", "sub", "usuarioId", "fechaAlta"],
});
identidadExternaSchema.index({ proveedor: 1, sub: 1 }, { unique: true });
identidadExternaSchema.index({ usuarioId: 1 }, { unique: true });

export const IdentidadExternaModel = mongoose.model(
  "IdentidadExterna",
  identidadExternaSchema,
);
