import mongoose from "mongoose";
import { NotificacionInterna } from "../domain/NotificacionInterna.js";
import { aplicarFormatoJSON } from "./formatoJSON.js";

const envioSchema = new mongoose.Schema(
  {
    canal: { type: String, required: true },
    exito: { type: Boolean, required: true },
  },
  // Objeto de valor: sin _id ni virtual id.
  { _id: false, id: false },
);

// Coleccion propia y no embebida en el colaborador: crece sin limite y se
// consulta paginada, dos cosas que un array embebido hace mal.
const notificacionSchema = new mongoose.Schema(
  {
    // Referencia al colaborador destinatario.
    destinatarioId: { type: String, required: true },
    tipo: { type: String, required: true },
    asunto: { type: String, required: true },
    contenido: { type: String, required: true },
    // Ids relacionados (proyectoId, perfilId...) para que el frontend arme links.
    referencias: { type: mongoose.Schema.Types.Mixed, default: {} },
    fecha: { type: Date, default: Date.now },
    esLeida: { type: Boolean, default: false },
    // Resultado de replicarla por los medios externos: [{ canal, exito }].
    envios: { type: [envioSchema], default: [] },
  },
  // minimize: false guarda `referencias: {}` aunque este vacio.
  { collection: "notificaciones", minimize: false },
);

notificacionSchema.loadClass(NotificacionInterna);
aplicarFormatoJSON(notificacionSchema);

// La consulta de siempre: las de una persona, de la mas nueva a la mas vieja.
notificacionSchema.index({ destinatarioId: 1, fecha: -1 });

export const NotificacionModel = mongoose.model("Notificacion", notificacionSchema);
