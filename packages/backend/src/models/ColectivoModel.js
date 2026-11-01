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

// Colectivo es el agregado raiz: proyectos, perfiles, colaboraciones, logros
// y avances viven EMBEBIDOS en su documento. Los colaboradores son entidades
// compartidas: de ellos se guarda la referencia (ObjectId) y se traen con
// populate. De las habilidades se guarda una copia (habilidadEmbebidaSchema).
//
// Cada schema carga su clase de dominio con loadClass: lo que devuelve
// Mongoose ya tiene los metodos (proyecto.aceptaPostulaciones(), etc.).
//
// Ningun schema declara _id: Mongoose genera un ObjectId para el colectivo y
// para cada subdocumento de una lista. Los objetos de valor no llevan.
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
  descripcion: { type: String, required: true },
  compromiso: { type: compromisoSchema, required: true },
  modalidadColaboracion: { type: String, required: true },
  habilidadesRequeridas: { type: [habilidadEmbebidaSchema], default: [] },
  habilidadesOpcionales: { type: [habilidadEmbebidaSchema], default: [] },
});
perfilSchema.loadClass(Perfil);
aplicarFormatoJSON(perfilSchema);

const colaboracionSchema = new mongoose.Schema({
  // Referencia: el colaborador vive en su propia coleccion.
  colaborador: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Colaborador",
    required: true,
  },
  esPublica: { type: Boolean, default: true },
  fecha: { type: Date, default: Date.now },
  estado: {
    type: String,
    enum: Object.values(COLABORACION_ESTADO),
    default: COLABORACION_ESTADO.PENDIENTE,
  },
  // Cuando se acepto o se rechazo.
  fechaResolucion: { type: Date, default: null },
  fechaFin: { type: Date, default: null },
  // Requerimiento adicional 39: lo que el colectivo opina de la persona, y
  // lo que la persona opina del colectivo.
  valoracionDelColectivo: { type: valoracionSchema, default: null },
  valoracionDelColaborador: { type: valoracionSchema, default: null },
});
colaboracionSchema.loadClass(Colaboracion);
aplicarFormatoJSON(colaboracionSchema, {
  // Contribucion anonima: "figurara efectivamente en la plataforma como de
  // costumbre, pero no indicara quien la realizo" — enunciado, 2da entrega.
  // El colaborador sigue guardado (el sistema lo necesita para que nadie se
  // anote dos veces); solo se oculta al mostrarla.
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

// Cada carga periodica del porcentaje de concrecion y los enlaces. Es el
// historial: solo se agregan, nunca se editan ni se borran.
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
  // Los tres se derivan del ultimo avance (hook de abajo).
  porcentajeConcrecion: { type: Number, default: 0 },
  urlSistema: { type: String, default: null },
  urlRepositorio: { type: String, default: null },
  perfiles: { type: [perfilSchema], default: [] },
  colaboraciones: { type: [colaboracionSchema], default: [] },
  logros: { type: [logroSchema], default: [] },
  avances: { type: [avanceSchema], default: [] },
  etiquetas: { type: [String], default: [] },
  // Requerimiento adicional 8. TODO_SUMA sin limite es lo que pasaba antes de
  // que existieran las postulaciones: quien se anota, queda adentro.
  modoAceptacion: {
    type: String,
    enum: Object.values(MODO_ACEPTACION),
    default: MODO_ACEPTACION.TODO_SUMA,
  },
  limiteVacantes: { type: Number, default: null },
  fechaCreacion: { type: Date, default: Date.now },
  fechaFinalizacion: { type: Date, default: null },
  // Requerimiento adicional 10: fecha limite para cerrarse solo.
  fechaCierre: { type: Date, default: null },
  // Requerimiento adicional 17: cuantas veces se consulto el proyecto.
  visualizaciones: { type: Number, default: 0 },
});
proyectoSchema.loadClass(Proyecto);

// Campo calculado ANTES de guardar: el porcentaje y los enlaces vigentes del
// proyecto son los del ultimo avance cargado. Se guardan igual (los listados
// y las estadisticas los leen sin recorrer el historial), pero los calcula el
// hook, asi que nunca quedan desincronizados con los avances.
//
// pre('validate') y no pre('save'): corre tambien en los tests con el
// repositorio en memoria, que valida pero no guarda.
proyectoSchema.pre("validate", function () {
  const ultimo = this.ultimoAvance();
  if (ultimo) {
    this.porcentajeConcrecion = ultimo.porcentajeConcrecion;
    this.urlSistema = ultimo.urlSistema ?? null;
    this.urlRepositorio = ultimo.urlRepositorio ?? null;
  }
});
aplicarFormatoJSON(proyectoSchema);

const colectivoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    descripcion: { type: String, required: true },
    tipoColectivo: { type: String, required: true },
    ubicacion: { type: ubicacionSchema, default: null },
    proyectos: { type: [proyectoSchema], default: [] },
    redesSociales: { type: [redSocialSchema], default: [] },
    etiquetas: { type: [String], default: [] },
    // Datos de contacto publicos de la organizacion (a diferencia de los de
    // las personas colaboradoras, que no se muestran).
    mediosDeContacto: { type: [medioDeContactoSchema], default: [] },
    fechaAlta: { type: Date, default: Date.now },
    fechaBaja: { type: Date, default: null },
  },
  {
    // createdAt se usa solo para ordenar los listados paginados: sin un orden
    // explicito, Mongo no garantiza que dos paginas seguidas no se pisen.
    timestamps: true,
    // Concurrencia optimista con el __v: si dos pedidos leen el mismo
    // colectivo y los dos lo guardan (por ejemplo, dos postulaciones al mismo
    // proyecto a la vez), el segundo save() falla con un VersionError en vez
    // de pisar en silencio lo que guardo el primero.
    optimisticConcurrency: true,
  },
);
colectivoSchema.loadClass(Colectivo);
aplicarFormatoJSON(colectivoSchema, { ocultar: ["createdAt", "updatedAt"] });

// Para que buscarProyecto no recorra toda la coleccion.
colectivoSchema.index({ "proyectos._id": 1 });
// Para los filtros por etiqueta de GET /colectivos y GET /proyectos.
colectivoSchema.index({ etiquetas: 1 });
colectivoSchema.index({ "proyectos.etiquetas": 1 });
// Para el historial y las valoraciones de una persona.
colectivoSchema.index({ "proyectos.colaboraciones.colaborador": 1 });

export const ColectivoModel = mongoose.model("Colectivo", colectivoSchema);
