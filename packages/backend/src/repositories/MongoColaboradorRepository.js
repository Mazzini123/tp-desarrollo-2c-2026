import { ColaboradorModel } from "../models/ColaboradorModel.js";
import { esIdValido } from "./ids.js";

// Sin traduccion dominio <-> documento: lo que devuelve Mongoose ya es un
// Colaborador con sus metodos (loadClass). Las habilidades vienen adentro
// (copia desnormalizada), asi que tampoco hay que ir a buscarlas.
export class MongoColaboradorRepository {
  async guardar(colaborador) {
    return colaborador.save();
  }

  async buscarPorId(id) {
    return esIdValido(id) ? ColaboradorModel.findById(id) : null;
  }

  async listar() {
    return ColaboradorModel.find().sort({ _id: 1 });
  }

  // Las que tienen TODAS las habilidades pedidas: $all compara contra los
  // codigos guardados, sin traer a memoria a las que no califican.
  async buscarPorHabilidades(codigos) {
    return ColaboradorModel.find({ "habilidades.codigo": { $all: codigos } }).sort({ _id: 1 });
  }

  async listarPaginado(numeroPagina, limitePorPagina) {
    const salto = (numeroPagina - 1) * limitePorPagina;

    const [items, total] = await Promise.all([
      ColaboradorModel.find().sort({ _id: 1 }).skip(salto).limit(limitePorPagina),
      ColaboradorModel.countDocuments(),
    ]);

    return { items, total };
  }
}
