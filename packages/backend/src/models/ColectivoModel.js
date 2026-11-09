import { createHash } from "node:crypto";
import mongoose from "mongoose";
import { Colectivo } from "../domain/Colectivo.js";
import { Proyecto } from "../domain/Proyecto.js";
import { Perfil } from "../domain/Perfil.js";
import { Colaboracion } from "../domain/Colaboracion.js";
import { Ubicacion } from "../domain/Ubicacion.js";
import { PROYECTO_ESTADO } from "../domain/enums/PROYECTO_ESTADO.js";
import { MODO_ACEPTACION } from "../domain/enums/MODO_ACEPTACION.js";
import { COLABORACION_ESTADO } from "../domain/enums/COLABORACION_ESTADO.js";
import {
  habilidadEmbebidaSchema,
  medioDeContactoSchema,
  redSocialSchema,
} from "./subesquemas.js";
import { aplicarFormatoJSON } from "./formatoJSON.js";

const DE_VALOR = { _id: false, id: false };

const ubicacionSchema = new mongoose.Schema(
  {
    tipoUbicacion: { type: String, required: true },
    nombre: { type: String, default: null },
  },
  DE_VALOR,
);
ubicacionSchema.loadClass(Ubicacion);

const compromisoSchema = new mongoose.Schema(
  {
    cantidadHoras: { type: Number, required: true },
    periodo: { type: String, required: true },
  },
  DE_VALOR,
);

const valoracionSchema = new mongoose.Schema(
  {
    puntaje: { type: Number, required: true, min: 1, max: 5 },
    comentario: { type: String, default: null },
    fecha: { type: Date, default: Date.now },
  },
  DE_VALOR,
);

const perfilSchema = new mongoose.Schema({
  titulo: { type: String, default: null },
  descripcion: { type: String, required: true },
  compromiso: { type: compromisoSchema, required: true },
  modalidadColaboracion: { type: String, required: true },
  habilidadesRequeridas: { type: [habilidadEmbebidaSchema], default: [] },
  habilidadesOpcionales: { type: [habilidadEmbebidaSchema], default: [] },
  busquedaAbierta: { type: Boolean, default: true },
  fechaCierreBusqueda: { type: Date, default: null },
  limiteColaboraciones: { type: Number, default: null },
  modoAceptacion: {
    type: String,
    enum: Object.values(MODO_ACEPTACION),
    default: MODO_ACEPTACION.REVISION_MANUAL,
  },
});
perfilSchema.loadClass(Perfil);
perfilSchema.virtual("versionEdicion").get(function () {
  return createHash("sha256")
    .update(
      JSON.stringify([
        this.id,
        this.titulo,
        this.descripcion,
        this.compromiso?.cantidadHoras,
        this.compromiso?.periodo,
        this.modalidadColaboracion,
        this.busquedaAbierta,
        this.fechaCierreBusqueda,
        this.limiteColaboraciones,
        this.modoAceptacion,
        this.codigosRequeridos(),
        this.codigosOpcionales(),
      ]),
    )
    .digest("hex");
});
perfilSchema.virtual("estadoBusqueda").get(function () {
  const proyecto = this.parent?.();
  return proyecto ? this.estadoDeBusqueda(proyecto) : null;
});
aplicarFormatoJSON(perfilSchema);

const colaboracionSchema = new mongoose.Schema({
  colaborador: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Colaborador",
    required: true,
  },
  perfil: { type: mongoose.Schema.Types.ObjectId, required: true },
  esPublica: { type: Boolean, default: true },
  fecha: { type: Date, default: Date.now },
  estado: {
    type: String,
    enum: Object.values(COLABORACION_ESTADO),
    default: COLABORACION_ESTADO.PENDIENTE,
  },
  fechaResolucion: { type: Date, default: null },
  fechaFin: { type: Date, default: null },
  // Requerimiento adicional 39: lo que el colectivo opina de la persona, y
  // lo que la persona opina del colectivo.
  valoracionDelColectivo: { type: valoracionSchema, default: null },
  valoracionDelColaborador: { type: valoracionSchema, default: null },
});
colaboracionSchema.loadClass(Colaboracion);
aplicarFormatoJSON(colaboracionSchema, {
  transformar(colaboracion, salida) {
    if (!colaboracion.esPublica) {
      salida.colaborador = null;
    }
  },
});

const logroSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  descripcion: { type: String, default: "" },
  fecha: { type: Date, default: Date.now },
});
aplicarFormatoJSON(logroSchema);

const avanceSchema = new mongoose.Schema({
  porcentajeConcrecion: { type: Number, required: true, min: 0, max: 100 },
  urlSistema: { type: String, default: null },
  urlRepositorio: { type: String, default: null },
  fecha: { type: Date, default: Date.now },
});
aplicarFormatoJSON(avanceSchema);

const proyectoSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  descripcion: { type: String, required: true },
  estado: {
    type: String,
    enum: Object.values(PROYECTO_ESTADO),
    default: PROYECTO_ESTADO.ABIERTO,
  },
  porcentajeConcrecion: { type: Number, default: 0 },
  urlSistema: { type: String, default: null },
  urlRepositorio: { type: String, default: null },
  perfiles: { type: [perfilSchema], default: [] },
  colaboraciones: { type: [colaboracionSchema], default: [] },
  logros: { type: [logroSchema], default: [] },
  avances: { type: [avanceSchema], default: [] },
  etiquetas: { type: [String], default: [] },
  fechaCreacion: { type: Date, default: Date.now },
  fechaFinalizacion: { type: Date, default: null },
  // Requerimiento adicional 10: fecha limite para cerrarse solo.
  fechaCierre: { type: Date, default: null },
  // Requerimiento adicional 17: cuantas veces se consulto el proyecto.
  visualizaciones: { type: Number, default: 0 },
  idempotenciaPublicacion: {
    clave: String,
    huella: String,
  },
});
proyectoSchema.loadClass(Proyecto);
proyectoSchema.pre("validate", function () {
  const ultimo = this.ultimoAvance();
  if (ultimo) {
    this.porcentajeConcrecion = ultimo.porcentajeConcrecion;
    this.urlSistema = ultimo.urlSistema ?? null;
    this.urlRepositorio = ultimo.urlRepositorio ?? null;
  }
});
proyectoSchema.virtual("colectivo").get(function () {
  const colectivo = this.parent?.();
  return colectivo?.nombre === undefined
    ? undefined
    : {
        id: colectivo.id,
        nombre: colectivo.nombre,
        ubicacion: colectivo.ubicacion ?? null,
      };
});
aplicarFormatoJSON(proyectoSchema, { ocultar: ["idempotenciaPublicacion"] });

const colectivoSchema = new mongoose.Schema(
  {
    cuentaId: { type: String, default: null },
    nombre: { type: String, required: true },
    descripcion: { type: String, required: true },
    tipoColectivo: { type: String, required: true },
    ubicacion: { type: ubicacionSchema, default: null },
    proyectos: { type: [proyectoSchema], default: [] },
    redesSociales: { type: [redSocialSchema], default: [] },
    etiquetas: { type: [String], default: [] },
    mediosDeContacto: { type: [medioDeContactoSchema], default: [] },
    fechaAlta: { type: Date, default: Date.now },
    fechaBaja: { type: Date, default: null },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  },
);
colectivoSchema.loadClass(Colectivo);
aplicarFormatoJSON(colectivoSchema, {
  ocultar: ["createdAt", "updatedAt", "mediosDeContacto", "cuentaId"],
  transformar(_colectivo, salida) {
    for (const proyecto of salida.proyectos ?? []) {
      delete proyecto.colectivo;
    }
  },
});
colectivoSchema.index(
  { cuentaId: 1 },
  { unique: true, partialFilterExpression: { cuentaId: { $type: "string" } } },
);
colectivoSchema.index({ "proyectos._id": 1 });
colectivoSchema.index({ etiquetas: 1 });
colectivoSchema.index({ "proyectos.etiquetas": 1 });
colectivoSchema.index({ "proyectos.colaboraciones.colaborador": 1 });

export const ColectivoModel = mongoose.model("Colectivo", colectivoSchema);
