import { HabilidadModel } from "../models/HabilidadModel.js";
import { paginar } from "./paginar.js";

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

  async buscarPorCodigos(codigos) {
    return HabilidadModel.find({ codigo: { $in: codigos } });
  }

  async listar() {
    return HabilidadModel.find().sort({ _id: 1 });
  }

  async listarPaginado(pagina) {
    return paginar(HabilidadModel, {}, pagina, { orden: { _id: 1 } });
  }

  async existeCodigo(codigo) {
    return (await HabilidadModel.exists({ codigo })) !== null;
  }
}
