import mongoose from "mongoose";

const envioSchema = new mongoose.Schema(
  {
    canal: { type: String, required: true },
    exito: { type: Boolean, required: true },
  },
  { _id: false },
);

// Coleccion propia y no embebida en el colaborador: crece sin limite y se
// consulta paginada, dos cosas que un array embebido hace mal.
const notificacionSchema = new mongoose.Schema(
  {
    _id: { type: String },
    // Referencia al colaborador destinatario.
    destinatarioId: { type: String, required: true },
    tipo: { type: String, required: true },
    asunto: { type: String, required: true },
    contenido: { type: String, required: true },
    referencias: { type: mongoose.Schema.Types.Mixed, default: {} },
    fecha: { type: Date, required: true },
    esLeida: { type: Boolean, default: false },
    envios: { type: [envioSchema], default: [] },
  },
  { versionKey: false, collection: "notificaciones", minimize: false },
);

// La consulta de siempre: las de una persona, de la mas nueva a la mas vieja.
notificacionSchema.index({ destinatarioId: 1, fecha: -1 });

export const NotificacionModel = mongoose.model("Notificacion", notificacionSchema);
