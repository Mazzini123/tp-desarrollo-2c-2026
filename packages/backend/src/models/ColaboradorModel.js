import mongoose from "mongoose";
import { Colaborador } from "../domain/Colaborador.js";
import {
  habilidadEmbebidaSchema,
  medioDeContactoSchema,
  redSocialSchema,
} from "./subesquemas.js";
import { aplicarFormatoJSON } from "./formatoJSON.js";

const colaboradorSchema = new mongoose.Schema({
  cuentaId: { type: String, default: null },
  nombreFantasia: { type: String, default: null },
  nombre: { type: String, default: null },
  apellido: { type: String, default: null },
  cuentaGit: { type: String, default: null },
  presentacion: { type: String, default: null },
  pronombres: { type: [String], default: [] },
  recibeMensajeriaInterna: { type: Boolean, default: true },
  mediosDeContacto: { type: [medioDeContactoSchema], default: [] },
  redesSociales: { type: [redSocialSchema], default: [] },
  habilidades: { type: [habilidadEmbebidaSchema], default: [] },
  fechaBaja: { type: Date, default: null },
});
colaboradorSchema.loadClass(Colaborador);
aplicarFormatoJSON(colaboradorSchema, {
  campos: [
    "id",
    "nombreFantasia",
    "nombre",
    "apellido",
    "cuentaGit",
    "presentacion",
    "pronombres",
    "recibeMensajeriaInterna",
    "redesSociales",
    "habilidades",
    "fechaBaja",
  ],
});
colaboradorSchema.index(
  { cuentaId: 1 },
  { unique: true, partialFilterExpression: { cuentaId: { $type: "string" } } },
);
colaboradorSchema.index({ "habilidades.codigo": 1 });

export const ColaboradorModel = mongoose.model("Colaborador", colaboradorSchema);
