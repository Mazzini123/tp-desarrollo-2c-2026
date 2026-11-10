import { IdentidadExternaModel } from "../models/IdentidadExternaModel.js";
import { esDuplicado } from "./duplicados.js";

export class MongoIdentidadExternaRepository {
  async buscar(proveedor, sub) {
    return IdentidadExternaModel.findOne({ proveedor, sub });
  }

  async crearSiNoExiste({ proveedor, sub, usuarioId }) {
    try {
      return await IdentidadExternaModel.findOneAndUpdate(
        { proveedor, sub },
        { $setOnInsert: { usuarioId, fechaAlta: new Date() } },
        { upsert: true, returnDocument: "after" },
      );
    } catch (error) {
      if (esDuplicado(error)) {
        return this.buscar(proveedor, sub);
      }
      throw error;
    }
  }
}
