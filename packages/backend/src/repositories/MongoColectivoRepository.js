import mongoose from "mongoose";
import { ColectivoModel } from "../models/ColectivoModel.js";
import { ConcurrenciaError } from "../errors/ConcurrenciaError.js";
import { esIdValido } from "./objectIds.js";
import { paginar } from "./paginar.js";

const ORDEN = { createdAt: 1, _id: 1 };

export class MongoColectivoRepository {
  async crear(datos) {
    return new ColectivoModel(datos).save();
  }

  async guardar(colectivo) {
    try {
      return await colectivo.save();
    } catch (error) {
      if (error instanceof mongoose.Error.VersionError) {
        throw new ConcurrenciaError();
      }
      throw error;
    }
  }

  async bloquear(id) {
    return esIdValido(id)
      ? ColectivoModel.findByIdAndUpdate(
          id,
          { $inc: { __v: 1 } },
          { returnDocument: "after", timestamps: false },
        )
      : null;
  }

  async buscarPorId(id) {
    return esIdValido(id) ? ColectivoModel.findById(id) : null;
  }

  async listarPaginado(pagina, { etiqueta } = {}) {
    const filtro = { fechaBaja: null, ...(etiqueta && { etiquetas: etiqueta }) };
    return paginar(ColectivoModel, filtro, pagina, { orden: ORDEN });
  }

  async buscarResumen(id) {
    return esIdValido(id)
      ? ColectivoModel.findById(id, { nombre: 1, fechaBaja: 1 })
      : null;
  }
}
