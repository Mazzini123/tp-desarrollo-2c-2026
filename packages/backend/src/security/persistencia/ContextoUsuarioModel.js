import mongoose from "mongoose";
import { TIPO_CONTEXTO } from "../autorizacion/enums/TIPO_CONTEXTO.js";
import { ROL } from "../autorizacion/enums/ROL.js";
import { aplicarFormatoJSON } from "../../models/formatoJSON.js";

const ObjectId = mongoose.Schema.Types.ObjectId;

export const ROLES_POR_TIPO = {
  [TIPO_CONTEXTO.COLABORADOR]: [ROL.COLABORADOR],
  [TIPO_CONTEXTO.COLECTIVO]: [ROL.MIEMBRO, ROL.LIDER],
};

export function problemaDeConsistencia({ tipo, rol, colectivoId, colaboradorId }) {
  if (!ROLES_POR_TIPO[tipo]?.includes(rol)) {
    return `El rol ${rol} no corresponde a un contexto ${tipo}`;
  }
  if (tipo === TIPO_CONTEXTO.COLABORADOR && (!colaboradorId || colectivoId)) {
    return "Un contexto COLABORADOR tiene colaborador y no tiene colectivo";
  }
  if (tipo === TIPO_CONTEXTO.COLECTIVO && (!colectivoId || colaboradorId)) {
    return "Un contexto COLECTIVO tiene colectivo y no tiene colaborador";
  }
  return null;
}

const contextoUsuarioSchema = new mongoose.Schema(
  {
    usuarioId: { type: ObjectId, required: true },
    tipo: { type: String, enum: Object.values(TIPO_CONTEXTO), required: true },
    colectivoId: { type: ObjectId, default: null },
    colaboradorId: { type: ObjectId, default: null },
    rol: { type: String, enum: Object.values(ROL), required: true },
    activo: { type: Boolean, default: true },
    fechaAlta: { type: Date, default: Date.now },
    fechaBaja: { type: Date, default: null },
  },
  { collection: "contextosUsuario" },
);
contextoUsuarioSchema.pre("validate", function () {
  const problema = problemaDeConsistencia(this);
  if (problema) {
    this.invalidate("tipo", problema);
  }
});
aplicarFormatoJSON(contextoUsuarioSchema, {
  campos: [
    "id",
    "usuarioId",
    "tipo",
    "colectivoId",
    "colaboradorId",
    "rol",
    "activo",
    "fechaAlta",
    "fechaBaja",
  ],
});

contextoUsuarioSchema.index(
  { usuarioId: 1, colectivoId: 1 },
  { unique: true, partialFilterExpression: { tipo: TIPO_CONTEXTO.COLECTIVO } },
);
contextoUsuarioSchema.index(
  { usuarioId: 1 },
  {
    name: "colaborador_activo_por_usuario",
    unique: true,
    partialFilterExpression: { tipo: TIPO_CONTEXTO.COLABORADOR, activo: true },
  },
);
contextoUsuarioSchema.index(
  { colaboradorId: 1 },
  { unique: true, partialFilterExpression: { tipo: TIPO_CONTEXTO.COLABORADOR } },
);
contextoUsuarioSchema.index(
  { colectivoId: 1 },
  { unique: true, partialFilterExpression: { rol: ROL.LIDER, activo: true } },
);
contextoUsuarioSchema.index({ usuarioId: 1, activo: 1 });
contextoUsuarioSchema.index({ colectivoId: 1, activo: 1 });

export const ContextoUsuarioModel = mongoose.model(
  "ContextoUsuario",
  contextoUsuarioSchema,
);

export const VALIDADOR_DE_CONTEXTOS = {
  $jsonSchema: {
    bsonType: "object",
    required: ["usuarioId", "tipo", "rol", "activo", "colaboradorId", "colectivoId"],
    properties: {
      usuarioId: { bsonType: "objectId" },
      activo: { bsonType: "bool" },
    },
    oneOf: [
      {
        properties: {
          tipo: { enum: [TIPO_CONTEXTO.COLABORADOR] },
          rol: { enum: ROLES_POR_TIPO[TIPO_CONTEXTO.COLABORADOR] },
          colaboradorId: { bsonType: "objectId" },
          colectivoId: { bsonType: "null" },
        },
      },
      {
        properties: {
          tipo: { enum: [TIPO_CONTEXTO.COLECTIVO] },
          rol: { enum: ROLES_POR_TIPO[TIPO_CONTEXTO.COLECTIVO] },
          colectivoId: { bsonType: "objectId" },
          colaboradorId: { bsonType: "null" },
        },
      },
    ],
  },
};
