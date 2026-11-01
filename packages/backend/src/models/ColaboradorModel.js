import mongoose from "mongoose";
import { Colaborador } from "../domain/Colaborador.js";
import {
  habilidadEmbebidaSchema,
  medioDeContactoSchema,
  redSocialSchema,
} from "./subesquemas.js";
import { aplicarFormatoJSON } from "./formatoJSON.js";

const colaboradorSchema = new mongoose.Schema({
  // _id: no se declara. Mongoose genera un ObjectId.
  nombreFantasia: { type: String, default: null },
  nombre: { type: String, default: null },
  apellido: { type: String, default: null },
  cuentaGit: { type: String, default: null },
  presentacion: { type: String, default: null },
  pronombres: { type: [String], default: [] },
  recibeMensajeriaInterna: { type: Boolean, default: true },
  mediosDeContacto: { type: [medioDeContactoSchema], default: [] },
  redesSociales: { type: [redSocialSchema], default: [] },
  // Copia de cada habilidad del catalogo (codigo y titulo): ver
  // habilidadEmbebidaSchema.
  habilidades: { type: [habilidadEmbebidaSchema], default: [] },
});

colaboradorSchema.loadClass(Colaborador);

// Lo que se ve de la persona hacia afuera. res.json llama a toJSON, asi que
// ningun endpoint puede mostrar los medios de contacto por olvido: "no se
// muestran de forma publica en la plataforma, pero quedan registrados
// internamente" — enunciado, 2da entrega.
aplicarFormatoJSON(colaboradorSchema, { ocultar: ["mediosDeContacto"] });

// Para la busqueda de colaboradoras por habilidades.
colaboradorSchema.index({ "habilidades.codigo": 1 });

export const ColaboradorModel = mongoose.model("Colaborador", colaboradorSchema);
