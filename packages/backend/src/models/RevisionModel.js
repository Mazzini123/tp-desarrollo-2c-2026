import mongoose from "mongoose";
import { ESTADO_REVISION } from "../domain/enums/ESTADO_REVISION.js";
import { MOTIVO_REVISION } from "../domain/enums/MOTIVO_REVISION.js";

const ObjectId = mongoose.Schema.Types.ObjectId;

export const INDICE_DE_REVISION_PENDIENTE = "revision_pendiente_por_proyecto_y_motivo";

const revisionSchema = new mongoose.Schema(
  {
    proyectoId: { type: ObjectId, ref: "Proyecto", required: true },
    motivo: { type: String, required: true, enum: Object.values(MOTIVO_REVISION) },
    estado: {
      type: String,
      enum: Object.values(ESTADO_REVISION),
      default: ESTADO_REVISION.PENDIENTE,
    },
    creadaEn: { type: Date, default: Date.now },
    resueltaPor: { type: ObjectId, ref: "Usuario", default: null },
    resueltaEn: { type: Date, default: null },
    nota: { type: String, default: null },
  },
  { collection: "revisiones", versionKey: false },
);

revisionSchema.index(
  { proyectoId: 1, motivo: 1 },
  {
    name: INDICE_DE_REVISION_PENDIENTE,
    unique: true,
    partialFilterExpression: { estado: ESTADO_REVISION.PENDIENTE },
  },
);
revisionSchema.index({ estado: 1, creadaEn: -1, _id: -1 });
revisionSchema.index({ proyectoId: 1, motivo: 1, resueltaEn: -1 });

export const RevisionModel = mongoose.model("Revision", revisionSchema);
