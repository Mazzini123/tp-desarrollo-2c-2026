import mongoose from "mongoose";
import {
  ACCION_ADMINISTRATIVA,
  TIPO_ENTIDAD_AUDITADA,
} from "../domain/enums/ACCION_ADMINISTRATIVA.js";
import { DE_VALOR } from "./subesquemas.js";

const ObjectId = mongoose.Schema.Types.ObjectId;

const entidadSchema = new mongoose.Schema(
  {
    tipo: { type: String, required: true, enum: Object.values(TIPO_ENTIDAD_AUDITADA) },
    id: { type: ObjectId, required: true },
  },
  DE_VALOR,
);

const accionAdministrativaSchema = new mongoose.Schema(
  {
    usuarioId: { type: ObjectId, ref: "Usuario", default: null },
    contextoId: { type: ObjectId, ref: "ContextoUsuario", default: null },
    accion: { type: String, required: true, enum: Object.values(ACCION_ADMINISTRATIVA) },
    entidad: { type: entidadSchema, required: true },
    detalle: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    fecha: { type: Date, default: Date.now },
  },
  { collection: "acciones_administrativas", minimize: false, versionKey: false },
);

accionAdministrativaSchema.index({ fecha: -1, _id: -1 });
accionAdministrativaSchema.index({ accion: 1, fecha: -1 });
accionAdministrativaSchema.index({ "entidad.tipo": 1, "entidad.id": 1, fecha: -1 });

export const AccionAdministrativaModel = mongoose.model(
  "AccionAdministrativa",
  accionAdministrativaSchema,
);
