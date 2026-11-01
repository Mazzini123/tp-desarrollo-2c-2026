import { HabilidadModel } from "../models/HabilidadModel.js";

// Sin traduccion dominio <-> documento: lo que devuelve Mongoose ya es una
// Habilidad con sus metodos (loadClass), y lo que se guarda es ese mismo
// documento.
export class MongoHabilidadRepository {
  async guardar(habilidad) {
    return habilidad.save();
  }

  async buscarPorCodigo(codigo) {
    return HabilidadModel.findOne({ codigo });
  }

  async listar() {
    return HabilidadModel.find().sort({ _id: 1 });
  }

  async listarPaginado(numeroPagina, limitePorPagina) {
    const salto = (numeroPagina - 1) * limitePorPagina;

    // Las dos consultas son independientes: las lanzamos en paralelo.
    const [items, total] = await Promise.all([
      HabilidadModel.find().sort({ _id: 1 }).skip(salto).limit(limitePorPagina),
      HabilidadModel.countDocuments(),
    ]);

    return { items, total };
  }

  async existeCodigo(codigo) {
    return (await HabilidadModel.exists({ codigo })) !== null;
  }
}
