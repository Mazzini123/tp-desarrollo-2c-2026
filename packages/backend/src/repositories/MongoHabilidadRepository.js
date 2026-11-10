import { HabilidadModel } from "../models/HabilidadModel.js";

export class MongoHabilidadRepository {
  async crear(datos) {
    return new HabilidadModel(datos).save();
  }

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
