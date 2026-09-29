import mongoose from "mongoose";

const medioDeContactoSchema = new mongoose.Schema(
  {
    tipo: { type: String, required: true },
    valor: { type: String, required: true },
  },
  { _id: false }, // sin id propio: es parte del colaborador, no una entidad aparte
);

const colaboradorSchema = new mongoose.Schema(
  {
    _id: { type: String }, // el uuid que genera el dominio
    nombreFantasia: { type: String, default: null },
    nombre: { type: String, default: null },
    apellido: { type: String, default: null },
    cuentaGit: { type: String, default: null },
    presentacion: { type: String, default: null },
    pronombres: { type: [String], default: [] },
    recibeMensajeriaInterna: { type: Boolean, default: true },
    mediosDeContacto: { type: [medioDeContactoSchema], default: [] },
    // Referencia al catalogo: guardamos solo los codigos.
    codigosHabilidades: { type: [String], default: [] },
  },
  { versionKey: false },
);

// Para la busqueda de colaboradoras por habilidades.
colaboradorSchema.index({ codigosHabilidades: 1 });

export const ColaboradorModel = mongoose.model("Colaborador", colaboradorSchema);