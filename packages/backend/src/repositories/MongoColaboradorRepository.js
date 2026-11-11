import mongoose from "mongoose";
import { ConcurrenciaError } from "../errors/ConcurrenciaError.js";
import { ColaboradorModel } from "../models/ColaboradorModel.js";
import { aObjectId, esIdValido } from "./objectIds.js";
import { paginar } from "./paginar.js";
import { salto } from "../utils/paginacion.js";

export class MongoColaboradorRepository {
  async crear(datos) {
    return new ColaboradorModel(datos).save();
  }

  async guardar(colaborador) {
    try {
      return await colaborador.save();
    } catch (error) {
      if (error instanceof mongoose.Error.VersionError) throw new ConcurrenciaError();
      throw error;
    }
  }

  async bloquear(id) {
    return esIdValido(id)
      ? ColaboradorModel.findByIdAndUpdate(
          id,
          { $inc: { __v: 1 } },
          { returnDocument: "after" },
        )
      : null;
  }

  async buscarPorId(id) {
    return esIdValido(id) ? ColaboradorModel.findById(id) : null;
  }

  async ultimoId() {
    return (
      (await ColaboradorModel.findOne().sort({ _id: -1 }).select("_id"))?._id ?? null
    );
  }

  async buscarParaAviso(perfiles, hastaId) {
    const alternativas = perfiles
      .filter((p) => p.habilidadesRequeridas.length > 0)
      .map((p) => ({
        "habilidades.codigo": { $all: p.habilidadesRequeridas.map((h) => h.codigo) },
      }));
    if (alternativas.length === 0 || !hastaId) return [];
    return ColaboradorModel.find({
      fechaBaja: null,
      recibeMensajeriaInterna: true,
      _id: { $lte: hastaId },
      $or: alternativas,
    }).sort({ _id: 1 });
  }

  async buscarPotenciales(
    { requeridas, opcionales = [], excluirIds = [] },
    { numeroPagina, limitePorPagina },
  ) {
    const [resultado] = await ColaboradorModel.aggregate([
      {
        $match: {
          "habilidades.codigo": { $all: requeridas },
          _id: { $nin: excluirIds.map(aObjectId) },
          fechaBaja: null,
        },
      },
      {
        $addFields: {
          cantidadDeOpcionales: {
            $size: {
              $setIntersection: [{ $ifNull: ["$habilidades.codigo", []] }, opcionales],
            },
          },
        },
      },
      { $sort: { cantidadDeOpcionales: -1, _id: 1 } },
      {
        $facet: {
          items: [
            { $skip: salto(numeroPagina, limitePorPagina) },
            { $limit: limitePorPagina },
          ],
          total: [{ $count: "cantidad" }],
        },
      },
    ]);

    return {
      items: resultado.items.map(({ cantidadDeOpcionales: _, ...documento }) => {
        const colaborador = ColaboradorModel.hydrate(documento);
        return {
          colaborador,
          habilidadesOpcionalesQueTiene: opcionales.filter((codigo) =>
            colaborador.habilidades.some((h) => h.codigo === codigo),
          ),
        };
      }),
      total: resultado.total[0]?.cantidad ?? 0,
    };
  }

  async listarPaginado(pagina) {
    return paginar(ColaboradorModel, { fechaBaja: null }, pagina, { orden: { _id: 1 } });
  }
}
