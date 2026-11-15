import mongoose from "mongoose";
import { aplicarFormatoJSON } from "../../models/formatoJSON.js";

const identidadExternaSchema = new mongoose.Schema(
  {
    proveedorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProveedorAutentificador",
      required: true,
    },
    identificadorExterno: { type: String, required: true },
    fechaAlta: { type: Date, default: Date.now },
  },
  { collection: "identidadesExternas" },
);
aplicarFormatoJSON(identidadExternaSchema, {
  campos: ["id", "proveedorId", "identificadorExterno", "fechaAlta"],
});
identidadExternaSchema.index(
  { proveedorId: 1, identificadorExterno: 1 },
  { unique: true },
);

export const IdentidadExternaModel = mongoose.model(
  "IdentidadExterna",
  identidadExternaSchema,
);
