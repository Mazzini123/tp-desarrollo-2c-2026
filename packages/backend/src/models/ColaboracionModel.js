import mongoose from "mongoose";
import { Colaboracion } from "../domain/Colaboracion.js";
import { COLABORACION_ESTADO } from "../domain/enums/COLABORACION_ESTADO.js";
import { DE_VALOR } from "./subesquemas.js";
import { aplicarFormatoJSON } from "./formatoJSON.js";

const ObjectId = mongoose.Schema.Types.ObjectId;

const valoracionSchema = new mongoose.Schema(
  {
    puntaje: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: Number.isSafeInteger,
    },
    comentario: { type: String, default: null },
    fecha: { type: Date, default: Date.now },
  },
  DE_VALOR,
);

const colaboracionSchema = new mongoose.Schema({
  proyectoId: { type: ObjectId, ref: "Proyecto", required: true },
  colectivoId: { type: ObjectId, required: true },
  colaborador: {
    type: ObjectId,
    ref: "Colaborador",
    required: true,
  },
  perfil: { type: ObjectId, required: true },
  esPublica: { type: Boolean, default: true },
  fecha: { type: Date, default: Date.now },
  estado: {
    type: String,
    enum: Object.values(COLABORACION_ESTADO),
    default: COLABORACION_ESTADO.PENDIENTE,
  },
  fechaResolucion: { type: Date, default: null },
  fechaFin: { type: Date, default: null },
  valoracionDelColectivo: { type: valoracionSchema, default: null },
  valoracionDelColaborador: { type: valoracionSchema, default: null },
});
colaboracionSchema.loadClass(Colaboracion);
aplicarFormatoJSON(colaboracionSchema, {
  campos: [
    "id",
    "colaborador",
    "perfil",
    "esPublica",
    "fecha",
    "estado",
    "fechaResolucion",
    "fechaFin",
    "valoracionDelColectivo",
    "valoracionDelColaborador",
  ],
  transformar(colaboracion, salida) {
    if (!colaboracion.esPublica) {
      salida.colaborador = null;
    }
  },
});

colaboracionSchema.index({ proyectoId: 1, fecha: 1 });
colaboracionSchema.index({ colaborador: 1 });
colaboracionSchema.index({ colectivoId: 1 });
colaboracionSchema.index({ colectivoId: 1, estado: 1, fecha: -1, _id: -1 });

export const ColaboracionModel = mongoose.model(
  "Colaboracion",
  colaboracionSchema,
  "colaboraciones",
);
