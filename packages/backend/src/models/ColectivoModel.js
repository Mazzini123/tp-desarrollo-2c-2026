import mongoose from "mongoose";
import { medioDeContactoSchema, redSocialSchema } from "./subesquemas.js";

// Colectivo es el agregado raiz: proyectos, perfiles y colaboraciones viven
// EMBEBIDOS en su documento. Habilidades y colaboradores son entidades
// compartidas, asi que de ellos guardamos solo la referencia.
//
// Los subdocumentos usan como _id el uuid que genera el dominio, igual que
// el colaborador. Asi no hay dos identificadores para lo mismo.

const ubicacionSchema = new mongoose.Schema(
  {
    tipoUbicacion: { type: String, required: true },
    nombre: { type: String, default: null },
  },
  { _id: false },
);

const compromisoSchema = new mongoose.Schema(
  {
    cantidadHoras: { type: Number, required: true },
    periodo: { type: String, required: true },
  },
  { _id: false },
);

const perfilSchema = new mongoose.Schema({
  _id: { type: String },
  descripcion: { type: String, required: true },
  compromiso: { type: compromisoSchema, required: true },
  modalidadColaboracion: { type: String, required: true },
  // Referencias al catalogo de habilidades.
  codigosHabilidadesRequeridas: { type: [String], default: [] },
  codigosHabilidadesOpcionales: { type: [String], default: [] },
});

const valoracionSchema = new mongoose.Schema(
  {
    puntaje: { type: Number, required: true },
    comentario: { type: String, default: null },
    fecha: { type: Date, required: true },
  },
  { _id: false },
);

const colaboracionSchema = new mongoose.Schema({
  _id: { type: String },
  // Referencia al colaborador: vive en su propia coleccion.
  colaboradorId: { type: String, required: true },
  esPublica: { type: Boolean, default: true },
  fecha: { type: Date, default: Date.now },
  estado: { type: String, required: true },
  fechaResolucion: { type: Date, default: null },
  fechaFin: { type: Date, default: null },
  valoracionDelColectivo: { type: valoracionSchema, default: null },
  valoracionDelColaborador: { type: valoracionSchema, default: null },
});

// El logro tiene _id porque el CRUD de logros lo busca por id
// (/proyectos/:id/logros/:logroId). Sin el, el id se perdia al guardar.
const logroSchema = new mongoose.Schema({
  _id: { type: String },
  titulo: { type: String, required: true },
  descripcion: { type: String, default: "" },
  fecha: { type: Date, default: Date.now },
});

// Cada carga periodica del porcentaje de concrecion y los enlaces. Es el
// historial: solo se agregan, nunca se editan ni se borran.
const avanceSchema = new mongoose.Schema({
  _id: { type: String },
  porcentajeConcrecion: { type: Number, required: true },
  urlSistema: { type: String, default: null },
  urlRepositorio: { type: String, default: null },
  fecha: { type: Date, required: true },
});

const proyectoSchema = new mongoose.Schema({
  _id: { type: String },
  titulo: { type: String, required: true },
  descripcion: { type: String, required: true },
  estado: { type: String, required: true },
  porcentajeConcrecion: { type: Number, default: 0 },
  urlSistema: { type: String, default: null },
  urlRepositorio: { type: String, default: null },
  perfiles: { type: [perfilSchema], default: [] },
  colaboraciones: { type: [colaboracionSchema], default: [] },
  logros: { type: [logroSchema], default: [] },
  avances: { type: [avanceSchema], default: [] },
  etiquetas: { type: [String], default: [] },
  modoAceptacion: { type: String, required: true },
  limiteVacantes: { type: Number, default: null },
  fechaCreacion: { type: Date, default: null },
  fechaFinalizacion: { type: Date, default: null },
  fechaCierre: { type: Date, default: null },
  visualizaciones: { type: Number, default: 0 },
});

const colectivoSchema = new mongoose.Schema(
  {
    _id: { type: String }, // el uuid que genera el dominio
    nombre: { type: String, required: true },
    descripcion: { type: String, required: true },
    tipoColectivo: { type: String, required: true },
    ubicacion: { type: ubicacionSchema, default: null },
    proyectos: { type: [proyectoSchema], default: [] },
    redesSociales: { type: [redSocialSchema], default: [] },
    etiquetas: { type: [String], default: [] },
    mediosDeContacto: { type: [medioDeContactoSchema], default: [] },
    fechaAlta: { type: Date, default: null },
    fechaBaja: { type: Date, default: null },
  },
  {
    versionKey: false,
    // createdAt se usa solo para ordenar los listados paginados: sin un orden
    // explicito, Mongo no garantiza que dos paginas seguidas no se pisen.
    timestamps: true,
  },
);

// Para que buscarProyecto no recorra toda la coleccion.
colectivoSchema.index({ "proyectos._id": 1 });
// Para los filtros por etiqueta de GET /colectivos y GET /proyectos.
colectivoSchema.index({ etiquetas: 1 });
colectivoSchema.index({ "proyectos.etiquetas": 1 });
// Para el historial y las valoraciones de una persona.
colectivoSchema.index({ "proyectos.colaboraciones.colaboradorId": 1 });

export const ColectivoModel = mongoose.model("Colectivo", colectivoSchema);
