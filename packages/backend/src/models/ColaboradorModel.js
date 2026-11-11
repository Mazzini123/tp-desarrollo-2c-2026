import mongoose from "mongoose";
import { Colaborador } from "../domain/Colaborador.js";
import {
  habilidadEmbebidaSchema,
  medioDeContactoSchema,
  redSocialSchema,
} from "./subesquemas.js";
import { aplicarFormatoJSON } from "./formatoJSON.js";

const colaboradorSchema = new mongoose.Schema(
  {
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
  },
  { optimisticConcurrency: true },
);
colaboradorSchema.pre("validate", function () {
  if (!this.nombreFantasia && !this.cuentaGit && !(this.nombre && this.apellido))
    this.invalidate("nombre", "Falta una identificación de la persona");
  for (const [campo, clave] of [
    ["habilidades", (h) => h.codigo],
    ["pronombres", (p) => p],
    ["mediosDeContacto", (m) => m.tipo + ":" + m.valor],
  ]) {
    const valores = this[campo].map(clave);
    if (new Set(valores).size !== valores.length)
      this.invalidate(campo, "No se admiten valores repetidos");
  }
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
colaboradorSchema.index({ "habilidades.codigo": 1 });

export const ColaboradorModel = mongoose.model("Colaborador", colaboradorSchema);
