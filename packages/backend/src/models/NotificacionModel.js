import mongoose from "mongoose";
import { NotificacionInterna } from "../domain/NotificacionInterna.js";
import { aplicarFormatoJSON } from "./formatoJSON.js";
import { ESTADO_ENVIO } from "../domain/enums/ESTADO_ENVIO.js";

const envioSchema = new mongoose.Schema({
  canal: { type: String, required: true },
  destino: { type: String, required: true },
  estado: {
    type: String,
    enum: Object.values(ESTADO_ENVIO),
    default: ESTADO_ENVIO.PENDIENTE,
  },
  intentos: { type: Number, default: 0 },
  proximoIntento: { type: Date, default: Date.now },
  enProcesoHasta: { type: Date, default: null },
  reservaId: { type: String, default: null },
  ultimoError: { type: String, default: null },
  fechaEnvio: { type: Date, default: null },
});
envioSchema.virtual("exito").get(function () {
  return this.estado === ESTADO_ENVIO.ENVIADO;
});
aplicarFormatoJSON(envioSchema, { campos: ["canal", "estado", "exito", "intentos"] });

const notificacionSchema = new mongoose.Schema(
  {
    destinatarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Colaborador",
      required: true,
    },
    clave: { type: String },
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
aplicarFormatoJSON(notificacionSchema, {
  campos: [
    "id",
    "destinatarioId",
    "tipo",
    "asunto",
    "contenido",
    "referencias",
    "fecha",
    "esLeida",
    "envios",
  ],
});
notificacionSchema.index(
  { clave: 1 },
  { unique: true, partialFilterExpression: { clave: { $type: "string" } } },
);
notificacionSchema.index({ destinatarioId: 1, fecha: -1, _id: 1 });
notificacionSchema.index({ "envios.estado": 1, "envios.proximoIntento": 1 });

export const NotificacionModel = mongoose.model("Notificacion", notificacionSchema);
