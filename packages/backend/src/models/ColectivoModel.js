import mongoose from "mongoose";

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

const colaboracionSchema = new mongoose.Schema({
  _id: { type: String },
  // Referencia al colaborador: vive en su propia coleccion.
  colaboradorId: { type: String, required: true },
  esPublica: { type: Boolean, default: true },
  fecha: { type: Date, default: Date.now },
});

const logroSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: true },
    descripcion: { type: String, default: "" },
    fecha: { type: Date, default: Date.now },
  },
  { _id: false },
);

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
});

const colectivoSchema = new mongoose.Schema(
  {
    _id: { type: String }, // el uuid que genera el dominio
    nombre: { type: String, required: true },
    descripcion: { type: String, required: true },
    tipoColectivo: { type: String, required: true },
    ubicacion: { type: ubicacionSchema, default: null },
    proyectos: { type: [proyectoSchema], default: [] },
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

export const ColectivoModel = mongoose.model("Colectivo", colectivoSchema);
