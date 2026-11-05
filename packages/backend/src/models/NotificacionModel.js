import mongoose from "mongoose";
import { NotificacionInterna } from "../domain/NotificacionInterna.js";
import { aplicarFormatoJSON } from "./formatoJSON.js";

const envioSchema = new mongoose.Schema(
  {
    canal: { type: String, required: true },
    exito: { type: Boolean, required: true },
  },
  { _id: false, id: false },
);

const notificacionSchema = new mongoose.Schema(
  {
    destinatarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Colaborador",
      required: true,
    },
    tipo: { type: String, required: true },
    asunto: { type: String, required: true },
    contenido: { type: String, required: true },
    referencias: { type: mongoose.Schema.Types.Mixed, default: {} },
    fecha: { type: Date, default: Date.now },
    esLeida: { type: Boolean, default: false },
    envios: { type: [envioSchema], default: [] },
  },
  { collection: "notificaciones", minimize: false },
);

notificacionSchema.loadClass(NotificacionInterna);
aplicarFormatoJSON(notificacionSchema);
notificacionSchema.index({ destinatarioId: 1, fecha: -1 });

export const NotificacionModel = mongoose.model("Notificacion", notificacionSchema);
