import mongoose from "mongoose";
import { aplicarFormatoJSON } from "../../models/formatoJSON.js";

const ObjectId = mongoose.Schema.Types.ObjectId;
const ES_OBJECT_ID = { $type: "objectId" };
const ES_NULO = { $type: "null" };

export const INDICE_DE_LIDER_ACTIVO = "lider_activo_por_colectivo";

const contextoUsuarioSchema = new mongoose.Schema(
  {
    usuarioId: { type: ObjectId, ref: "Usuario", required: true },
    tipoContextoId: { type: ObjectId, ref: "TipoContexto", required: true },
    colectivoId: { type: ObjectId, ref: "Colectivo", default: null },
    colaboradorId: { type: ObjectId, ref: "Colaborador", default: null },
    rolId: { type: ObjectId, ref: "Rol", required: true },
    activo: { type: Boolean, default: true },
    fechaAlta: { type: Date, default: Date.now },
    fechaBaja: { type: Date, default: null },
  },
  { collection: "contextosUsuario" },
);

contextoUsuarioSchema.virtual("tipo").get(function () {
  return this.$locals.tipo ?? null;
});
contextoUsuarioSchema.virtual("rol").get(function () {
  return this.$locals.rol ?? null;
});

contextoUsuarioSchema.pre("validate", function () {
  if (this.colectivoId && this.colaboradorId) {
    this.invalidate(
      "tipoContextoId",
      "Un contexto pertenece a un colectivo o a un colaborador, nunca a ambos",
    );
  }
});
aplicarFormatoJSON(contextoUsuarioSchema, {
  campos: [
    "id",
    "usuarioId",
    "tipoContextoId",
    "tipo",
    "colectivoId",
    "colaboradorId",
    "rolId",
    "rol",
    "activo",
    "fechaAlta",
    "fechaBaja",
  ],
});

contextoUsuarioSchema.index(
  { usuarioId: 1, colectivoId: 1 },
  { unique: true, partialFilterExpression: { colectivoId: ES_OBJECT_ID } },
);
contextoUsuarioSchema.index(
  { usuarioId: 1 },
  {
    name: "colaborador_activo_por_usuario",
    unique: true,
    partialFilterExpression: { colaboradorId: ES_OBJECT_ID, activo: true },
  },
);
contextoUsuarioSchema.index(
  { usuarioId: 1 },
  {
    name: "administracion_activo_por_usuario",
    unique: true,
    partialFilterExpression: {
      colectivoId: ES_NULO,
      colaboradorId: ES_NULO,
      activo: true,
    },
  },
);
contextoUsuarioSchema.index(
  { colaboradorId: 1 },
  { unique: true, partialFilterExpression: { colaboradorId: ES_OBJECT_ID } },
);
contextoUsuarioSchema.index({ usuarioId: 1, activo: 1 });
contextoUsuarioSchema.index({ colectivoId: 1, activo: 1 });
contextoUsuarioSchema.index({ rolId: 1 });
contextoUsuarioSchema.index({ tipoContextoId: 1 });

export const ContextoUsuarioModel = mongoose.model(
  "ContextoUsuario",
  contextoUsuarioSchema,
);
