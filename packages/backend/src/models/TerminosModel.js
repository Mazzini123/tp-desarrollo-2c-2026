import mongoose from "mongoose";

const terminosSchema = new mongoose.Schema(
  {
    version: { type: Number, required: true, min: 1 },
    texto: { type: String, required: true },
    publicadoEn: { type: Date, required: true },
    publicadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", default: null },
  },
  { collection: "terminos", versionKey: false },
);

terminosSchema.index({ version: -1 }, { unique: true });

export const TerminosModel = mongoose.model("Terminos", terminosSchema);
