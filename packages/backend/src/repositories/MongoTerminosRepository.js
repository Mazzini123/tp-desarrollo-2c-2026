import { TerminosModel } from "../models/TerminosModel.js";
import { ConflictError } from "../errors/ConflictError.js";
import { esDuplicado } from "./duplicados.js";

export class MongoTerminosRepository {
  async buscarVigente() {
    return TerminosModel.findOne().sort({ version: -1 }).lean();
  }

  async crear(datos) {
    try {
      return (await TerminosModel.create([datos]))[0].toObject();
    } catch (error) {
      if (esDuplicado(error)) {
        throw new ConflictError(
          "Se publico otra version de los terminos al mismo tiempo: volve a intentarlo",
        );
      }
      throw error;
    }
  }
}
