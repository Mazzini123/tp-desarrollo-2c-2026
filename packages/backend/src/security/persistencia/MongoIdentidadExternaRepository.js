import { IdentidadExternaModel } from "./IdentidadExternaModel.js";
import { DuplicadoError } from "../../errors/DuplicadoError.js";

export class MongoIdentidadExternaRepository {
  async buscar(proveedor, sub) {
    return IdentidadExternaModel.findOne({ proveedor, sub });
  }

  async crear(datos) {
    try {
      return await IdentidadExternaModel.create(datos);
    } catch (error) {
      if (error.code === 11000 && error.keyPattern?.proveedor && error.keyPattern?.sub) {
        throw new DuplicadoError("La identidad externa ya existe");
      }
      throw error;
    }
  }
}
