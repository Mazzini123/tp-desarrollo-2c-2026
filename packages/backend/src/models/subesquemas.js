import mongoose from "mongoose";

// Sub-esquemas que usan varios modelos. Van sin _id porque son objetos de
// valor: se guardan adentro del documento que los contiene.

export const redSocialSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    url: { type: String, required: true },
  },
  { _id: false },
);

export const medioDeContactoSchema = new mongoose.Schema(
  {
    tipo: { type: String, required: true },
    valor: { type: String, required: true },
  },
  { _id: false },
);
