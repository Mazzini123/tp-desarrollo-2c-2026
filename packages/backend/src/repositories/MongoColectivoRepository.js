import mongoose from "mongoose";
import { ColectivoModel } from "../models/ColectivoModel.js";
import { ConcurrenciaError } from "../errors/ConcurrenciaError.js";
import { esIdValido } from "./objectIds.js";
import { salto } from "../utils/paginacion.js";

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

  async buscarPorId(id) {
    return esIdValido(id) ? ColectivoModel.findById(id) : null;
  }

  async listarPaginado(numeroPagina, limitePorPagina, { etiqueta } = {}) {
    const filtro = etiqueta ? { etiquetas: etiqueta } : {};
    const [items, total] = await Promise.all([
      ColectivoModel.find(filtro)
        .sort(ORDEN)
        .skip(salto(numeroPagina, limitePorPagina))
        .limit(limitePorPagina),
      ColectivoModel.countDocuments(filtro),
    ]);

    return { items, total };
  }

  async buscarResumen(id) {
    return esIdValido(id)
      ? ColectivoModel.findById(id, { nombre: 1, fechaBaja: 1 })
      : null;
  }
}
