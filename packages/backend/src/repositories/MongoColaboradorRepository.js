import { ColaboradorModel } from "../models/ColaboradorModel.js";
import { aObjectId, esIdValido } from "./objectIds.js";

export class MongoColaboradorRepository {
  async crear(datos) {
    return new ColaboradorModel(datos).save();
  }

  async guardar(colaborador) {
    return colaborador.save();
  }

  async buscarPorId(id) {
    return esIdValido(id) ? ColaboradorModel.findById(id) : null;
  }

  async buscarPorHabilidades(codigos) {
    return ColaboradorModel.find({
      "habilidades.codigo": { $all: codigos },
      fechaBaja: null,
    }).sort({
      _id: 1,
    });
  }

  async buscarPotenciales(
    { requeridas, opcionales = [], excluirIds = [] },
    numeroPagina,
    limitePorPagina,
  ) {
    const salto = (numeroPagina - 1) * limitePorPagina;

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
          items: [{ $skip: salto }, { $limit: limitePorPagina }],
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

  async listarPaginado(numeroPagina, limitePorPagina) {
    const salto = (numeroPagina - 1) * limitePorPagina;

    const [items, total] = await Promise.all([
      ColaboradorModel.find().sort({ _id: 1 }).skip(salto).limit(limitePorPagina),
      ColaboradorModel.countDocuments(),
    ]);

    return { items, total };
  }
}
