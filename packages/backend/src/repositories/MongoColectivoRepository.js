import { ColectivoModel } from "../models/ColectivoModel.js";
import { aObjectId, esIdValido } from "./ids.js";

const ORDEN = { createdAt: 1, _id: 1 };

const COLABORADORES = { path: "proyectos.colaboraciones.colaborador" };

const lista = (campo) => ({ $ifNull: [campo, []] });

function algunPerfilDisponible(codigosDeLaPersona, ahora) {
  return {
    $anyElementTrue: [
      {
        $map: {
          input: lista("$proyectos.perfiles"),
          as: "perfil",
          in: {
            $and: [
              { $ne: [{ $ifNull: ["$$perfil.busquedaAbierta", true] }, false] },
              {
                $or: [
                  { $eq: [{ $ifNull: ["$$perfil.fechaCierreBusqueda", null] }, null] },
                  { $gt: ["$$perfil.fechaCierreBusqueda", ahora] },
                ],
              },
              {
                $or: [
                  { $eq: [{ $ifNull: ["$$perfil.limiteColaboraciones", null] }, null] },
                  {
                    $lt: [
                      {
                        $size: {
                          $filter: {
                            input: lista("$proyectos.colaboraciones"),
                            as: "colaboracion",
                            cond: {
                              $and: [
                                { $eq: ["$$colaboracion.estado", "ACEPTADA"] },
                                { $eq: ["$$colaboracion.perfil", "$$perfil._id"] },
                              ],
                            },
                          },
                        },
                      },
                      "$$perfil.limiteColaboraciones",
                    ],
                  },
                ],
              },
              { $gt: [{ $size: lista("$$perfil.habilidadesRequeridas") }, 0] },
              {
                $setIsSubset: [
                  lista("$$perfil.habilidadesRequeridas.codigo"),
                  codigosDeLaPersona,
                ],
              },
            ],
          },
        },
      },
    ],
  };
}
export class MongoColectivoRepository {
  async guardar(colectivo) {
    return colectivo.save();
  }

  async buscarPorId(id) {
    return esIdValido(id) ? ColectivoModel.findById(id).populate(COLABORADORES) : null;
  }

  async listar() {
    return ColectivoModel.find().sort(ORDEN).populate(COLABORADORES);
  }

  async listarPaginado(numeroPagina, limitePorPagina, { etiqueta } = {}) {
    const salto = (numeroPagina - 1) * limitePorPagina;
    const filtro = etiqueta ? { etiquetas: etiqueta } : {};
    const [items, total] = await Promise.all([
      ColectivoModel.find(filtro)
        .sort(ORDEN)
        .skip(salto)
        .limit(limitePorPagina)
        .populate(COLABORADORES),
      ColectivoModel.countDocuments(filtro),
    ]);

    return { items, total };
  }

  async buscarProyecto(proyectoId) {
    if (!esIdValido(proyectoId)) {
      return null;
    }

    const colectivo = await ColectivoModel.findOne({
      "proyectos._id": proyectoId,
    }).populate(COLABORADORES);

    return colectivo
      ? { colectivo, proyecto: colectivo.buscarProyecto(proyectoId) }
      : null;
  }

  async registrarVisualizacion(proyectoId) {
    if (!esIdValido(proyectoId)) {
      return;
    }

    await ColectivoModel.updateOne(
      { "proyectos._id": proyectoId },
      { $inc: { "proyectos.$.visualizaciones": 1 } },
      { timestamps: false },
    );
  }

  async buscarPerfil(proyectoId, perfilId) {
    const encontrado = await this.buscarProyecto(proyectoId);
    const perfil = encontrado?.proyecto.buscarPerfil(perfilId);

    return perfil ? { ...encontrado, perfil } : null;
  }

  async buscarConCierreVencido(ahora) {
    return ColectivoModel.find({
      "proyectos.estado": "ABIERTO",
      "proyectos.fechaCierre": { $lte: ahora },
    }).populate(COLABORADORES);
  }

  async buscarColectivosDeColaborador(colaboradorId) {
    if (!esIdValido(colaboradorId)) {
      return [];
    }

    return ColectivoModel.find({ "proyectos.colaboraciones.colaborador": colaboradorId })
      .sort(ORDEN)
      .populate(COLABORADORES);
  }

  async buscarProyectosCompatibles(
    colaborador,
    numeroPagina,
    limitePorPagina,
    ahora = new Date(),
  ) {
    const salto = (numeroPagina - 1) * limitePorPagina;
    const codigosDeLaPersona = colaborador.habilidades.map((h) => h.codigo);

    const [resultado] = await ColectivoModel.aggregate([
      { $sort: ORDEN },
      { $unwind: "$proyectos" },
      {
        $match: {
          "proyectos.estado": "ABIERTO",
          "proyectos.colaboraciones.colaborador": { $ne: aObjectId(colaborador) },
          $expr: algunPerfilDisponible(codigosDeLaPersona, ahora),
        },
      },
      {
        $facet: {
          items: [{ $skip: salto }, { $limit: limitePorPagina }],
          total: [{ $count: "cantidad" }],
        },
      },
    ]);

    return {
      items: await proyectosDesdeAgregacion(resultado.items),
      total: resultado.total[0]?.cantidad ?? 0,
    };
  }

  async listarProyectosPaginado(numeroPagina, limitePorPagina, { etiqueta } = {}) {
    const salto = (numeroPagina - 1) * limitePorPagina;
    const filtroPorEtiqueta = etiqueta
      ? [{ $match: { "proyectos.etiquetas": etiqueta } }]
      : [];
    const [resultado] = await ColectivoModel.aggregate([
      { $sort: ORDEN },
      { $unwind: "$proyectos" },
      ...filtroPorEtiqueta,
      {
        $facet: {
          items: [{ $skip: salto }, { $limit: limitePorPagina }],
          total: [{ $count: "cantidad" }],
        },
      },
    ]);

    return {
      items: await proyectosDesdeAgregacion(resultado.items),
      total: resultado.total[0]?.cantidad ?? 0,
    };
  }
}

export async function proyectosDesdeAgregacion(filas) {
  const colectivos = filas.map((fila) =>
    ColectivoModel.hydrate({ _id: fila._id, proyectos: [fila.proyectos] }),
  );
  await ColectivoModel.populate(colectivos, COLABORADORES);
  return colectivos.map((colectivo) => colectivo.proyectos[0]);
}
