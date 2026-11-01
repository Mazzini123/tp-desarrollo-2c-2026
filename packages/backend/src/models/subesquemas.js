import mongoose from "mongoose";
import { Habilidad } from "../domain/Habilidad.js";
import { MedioDeContacto } from "../domain/MedioDeContacto.js";

// Sub-esquemas que usan varios modelos. Son objetos de valor: se guardan
// adentro del documento que los contiene, sin _id ni virtual id.
const DE_VALOR = { _id: false, id: false };

export const redSocialSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    url: { type: String, required: true },
  },
  DE_VALOR,
);

export const medioDeContactoSchema = new mongoose.Schema(
  {
    tipo: { type: String, required: true },
    valor: { type: String, required: true },
  },
  DE_VALOR,
);
medioDeContactoSchema.loadClass(MedioDeContacto);

// Copia de una habilidad del catalogo, guardada adentro de cada perfil y de
// cada persona. Es la opcion de DESNORMALIZAR: en vez de guardar solo el
// codigo y tener que ir a buscar el titulo a otra coleccion cada vez (un
// join a mano o un populate), se guarda lo que se muestra.
//
// Se puede porque el catalogo es precargado y una habilidad no cambia de
// titulo: el codigo sale del titulo. Si algun dia cambiara, habria que
// actualizar las copias.
export const habilidadEmbebidaSchema = new mongoose.Schema(
  {
    codigo: { type: String, required: true },
    titulo: { type: String, required: true },
  },
  DE_VALOR,
);
// equals por codigo: la copia y la del catalogo son la misma habilidad.
habilidadEmbebidaSchema.loadClass(Habilidad);
