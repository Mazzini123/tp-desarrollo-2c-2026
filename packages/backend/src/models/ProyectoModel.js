import { PERIODO_COMPROMISO } from "../domain/enums/PERIODO_COMPROMISO.js";
import { MODALIDAD_COLABORACION } from "../domain/enums/MODALIDAD_COLABORACION.js";
import { validarModoDeAceptacion } from "../services/reglasDePostulacion.js";
import { versionDePerfil } from "../utils/versionDePerfil.js";
import mongoose from "mongoose";
import { Proyecto } from "../domain/Proyecto.js";
import { Perfil } from "../domain/Perfil.js";
import { PROYECTO_ESTADO } from "../domain/enums/PROYECTO_ESTADO.js";
import { MODO_ACEPTACION } from "../domain/enums/MODO_ACEPTACION.js";
import { DE_VALOR, habilidadEmbebidaSchema, ubicacionSchema } from "./subesquemas.js";
import { aplicarFormatoJSON } from "./formatoJSON.js";
import { estadoDeBusqueda } from "../services/reglasDeBusqueda.js";

const compromisoSchema = new mongoose.Schema(
  {
    cantidadHoras: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isSafeInteger,
    },
    periodo: { type: String, required: true, enum: Object.values(PERIODO_COMPROMISO) },
  },
  DE_VALOR,
);

const perfilSchema = new mongoose.Schema({
  titulo: { type: String, default: null },
  descripcion: { type: String, required: true },
  compromiso: { type: compromisoSchema, required: true },
  modalidadColaboracion: {
    type: String,
    required: true,
    enum: Object.values(MODALIDAD_COLABORACION),
  },
  habilidadesRequeridas: {
    type: [habilidadEmbebidaSchema],
    default: [],
    validate: (lista) =>
      lista.length > 0 && new Set(lista.map((h) => h.codigo)).size === lista.length,
  },
  habilidadesOpcionales: { type: [habilidadEmbebidaSchema], default: [] },
  busquedaAbierta: { type: Boolean, default: true },
  fechaCierreBusqueda: { type: Date, default: null },
  limiteColaboraciones: {
    type: Number,
    default: null,
    min: 1,
    validate: (v) => v == null || Number.isSafeInteger(v),
  },
  modoAceptacion: {
    type: String,
    enum: Object.values(MODO_ACEPTACION),
    default: MODO_ACEPTACION.REVISION_MANUAL,
  },
  cupoCompleto: { type: Boolean, default: false },
});
perfilSchema.loadClass(Perfil);
perfilSchema.pre("validate", function () {
  try {
    validarModoDeAceptacion(this.modoAceptacion, this.limiteColaboraciones);
  } catch (error) {
    this.invalidate("modoAceptacion", error.message);
  }
  const requeridas = new Set(this.habilidadesRequeridas.map((h) => h.codigo));
  const opcionales = this.habilidadesOpcionales.map((h) => h.codigo);
  if (
    new Set(opcionales).size !== opcionales.length ||
    opcionales.some((c) => requeridas.has(c))
  ) {
    this.invalidate(
      "habilidadesOpcionales",
      "Las habilidades deben ser únicas y no pueden pertenecer a ambos grupos",
    );
  }
});
perfilSchema.virtual("cantidadAceptadas").get(function () {
  const proyecto = this.parent?.();
  return proyecto?.cantidadAceptadas(this);
});
perfilSchema.virtual("versionEdicion").get(function () {
  return versionDePerfil(this);
});
perfilSchema.virtual("estadoBusqueda").get(function () {
  const proyecto = this.parent?.();
  return proyecto ? estadoDeBusqueda(this, proyecto) : null;
});
aplicarFormatoJSON(perfilSchema, {
  campos: [
    "id",
    "titulo",
    "descripcion",
    "compromiso",
    "modalidadColaboracion",
    "habilidadesRequeridas",
    "habilidadesOpcionales",
    "busquedaAbierta",
    "fechaCierreBusqueda",
    "limiteColaboraciones",
    "modoAceptacion",
    "versionEdicion",
    "cantidadAceptadas",
    "estadoBusqueda",
  ],
});

const logroSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  descripcion: { type: String, default: "" },
  fecha: { type: Date, default: Date.now },
});
aplicarFormatoJSON(logroSchema, { campos: ["id", "titulo", "descripcion", "fecha"] });

const avanceSchema = new mongoose.Schema({
  porcentajeConcrecion: { type: Number, required: true, min: 0, max: 100 },
  urlSistema: { type: String, default: null },
  urlRepositorio: { type: String, default: null },
  fecha: { type: Date, default: Date.now },
});
aplicarFormatoJSON(avanceSchema, {
  campos: ["id", "porcentajeConcrecion", "urlSistema", "urlRepositorio", "fecha"],
});

const datosDelColectivoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    tipoColectivo: { type: String, required: true },
    ubicacion: { type: ubicacionSchema, default: null },
  },
  DE_VALOR,
);

const proyectoSchema = new mongoose.Schema(
  {
    colectivoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Colectivo",
      required: true,
    },
    datosDelColectivo: { type: datosDelColectivoSchema, required: true },
    titulo: { type: String, required: true },
    descripcion: { type: String, required: true },
    estado: {
      type: String,
      enum: Object.values(PROYECTO_ESTADO),
      default: PROYECTO_ESTADO.ABIERTO,
    },
    porcentajeConcrecion: { type: Number, default: 0, min: 0, max: 100 },
    urlSistema: { type: String, default: null },
    urlRepositorio: { type: String, default: null },
    perfiles: {
      type: [perfilSchema],
      default: [],
      validate: (lista) => lista.length > 0,
    },
    logros: { type: [logroSchema], default: [] },
    avances: { type: [avanceSchema], default: [] },
    etiquetas: { type: [String], default: [] },
    fechaCreacion: { type: Date, default: Date.now },
    fechaFinalizacion: { type: Date, default: null },
    fechaCierre: { type: Date, default: null },
    visualizaciones: { type: Number, default: 0 },
    idempotenciaPublicacion: {
      clave: String,
      huella: String,
    },
  },
  { optimisticConcurrency: true },
);
proyectoSchema.loadClass(Proyecto);
proyectoSchema.pre("validate", function () {
  const ultimo = this.ultimoAvance();
  if (ultimo) {
    this.porcentajeConcrecion = ultimo.porcentajeConcrecion;
    this.urlSistema = ultimo.urlSistema ?? null;
    this.urlRepositorio = ultimo.urlRepositorio ?? null;
  }
});
proyectoSchema
  .virtual("colaboraciones")
  .get(function () {
    this.$locals.colaboraciones ??= [];
    return this.$locals.colaboraciones;
  })
  .set(function (colaboraciones) {
    this.$locals.colaboraciones = colaboraciones;
  });
proyectoSchema.virtual("colectivo").get(function () {
  return this.datosDelColectivo
    ? {
        id: String(this.colectivoId),
        nombre: this.datosDelColectivo.nombre,
        ubicacion: this.datosDelColectivo.ubicacion ?? null,
      }
    : undefined;
});
aplicarFormatoJSON(proyectoSchema, {
  campos: [
    "id",
    "titulo",
    "descripcion",
    "estado",
    "porcentajeConcrecion",
    "urlSistema",
    "urlRepositorio",
    "perfiles",
    "colaboraciones",
    "logros",
    "avances",
    "etiquetas",
    "fechaCreacion",
    "fechaFinalizacion",
    "fechaCierre",
    "visualizaciones",
    "colectivo",
  ],
  transformar(_proyecto, salida) {
    salida.colaboraciones = (salida.colaboraciones ?? []).map((c) =>
      typeof c?.toJSON === "function" ? c.toJSON() : c,
    );
  },
});
proyectoSchema.index({ colectivoId: 1, fechaCreacion: 1 });
proyectoSchema.index({ estado: 1, fechaCierre: 1 });
proyectoSchema.index({ etiquetas: 1 });
proyectoSchema.index({ "perfiles.habilidadesRequeridas.codigo": 1 });
proyectoSchema.index(
  { colectivoId: 1, "idempotenciaPublicacion.clave": 1 },
  {
    unique: true,
    partialFilterExpression: { "idempotenciaPublicacion.clave": { $type: "string" } },
  },
);

export const ProyectoModel = mongoose.model("Proyecto", proyectoSchema, "proyectos");
