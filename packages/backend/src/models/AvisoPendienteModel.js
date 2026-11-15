import mongoose from "mongoose";
import { TIPO_AVISO } from "../domain/enums/TIPO_AVISO.js";
import { ESTADO_AVISO } from "../domain/enums/ESTADO_AVISO.js";

const avisoSchema = new mongoose.Schema(
  {
    clave: { type: String, required: true, unique: true },
    tipo: { type: String, enum: Object.values(TIPO_AVISO), required: true },
    entidadId: { type: mongoose.Schema.Types.ObjectId, required: true },
    hastaId: { type: mongoose.Schema.Types.ObjectId, default: null },
    estado: {
      type: String,
      enum: Object.values(ESTADO_AVISO),
      default: ESTADO_AVISO.PENDIENTE,
    },
    fecha: { type: Date, default: Date.now },
    proximoIntento: { type: Date, default: Date.now },
    intentos: { type: Number, default: 0 },
    ultimoError: { type: String, default: null },
  },
  { collection: "avisos_pendientes" },
);
avisoSchema.index({ estado: 1, proximoIntento: 1, fecha: 1 });
export const AvisoPendienteModel = mongoose.model("AvisoPendiente", avisoSchema);
