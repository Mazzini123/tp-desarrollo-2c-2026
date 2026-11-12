import mongoose from "mongoose";
import { ESTADO_SOLICITUD } from "../application/ESTADO_SOLICITUD.js";
import { aplicarFormatoJSON } from "../../models/formatoJSON.js";

const ObjectId = mongoose.Schema.Types.ObjectId;

const solicitudIngresoSchema = new mongoose.Schema(
  {
    colectivoId: { type: ObjectId, required: true },
    usuarioId: { type: ObjectId, required: true },
    estado: {
      type: String,
      enum: Object.values(ESTADO_SOLICITUD),
      default: ESTADO_SOLICITUD.PENDIENTE,
    },
    fechaSolicitud: { type: Date, default: Date.now },
    fechaResolucion: { type: Date, default: null },
    resueltaPor: { type: ObjectId, default: null },
  },
  { collection: "solicitudesIngreso" },
);
aplicarFormatoJSON(solicitudIngresoSchema, {
  campos: [
    "id",
    "colectivoId",
    "usuarioId",
    "estado",
    "fechaSolicitud",
    "fechaResolucion",
    "resueltaPor",
  ],
});
solicitudIngresoSchema.index(
  { colectivoId: 1, usuarioId: 1 },
  { unique: true, partialFilterExpression: { estado: ESTADO_SOLICITUD.PENDIENTE } },
);
solicitudIngresoSchema.index({ colectivoId: 1, estado: 1, fechaSolicitud: -1 });
solicitudIngresoSchema.index({ usuarioId: 1, estado: 1 });

export const SolicitudIngresoModel = mongoose.model(
  "SolicitudIngreso",
  solicitudIngresoSchema,
);
