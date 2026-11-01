import { ColaboradorModel } from "../models/ColaboradorModel.js";
import { aObjectId, esIdValido } from "./ids.js";

// Sin traduccion dominio <-> documento: lo que devuelve Mongoose ya es un
// Colaborador con sus metodos (loadClass). Las habilidades vienen adentro
// (copia desnormalizada), asi que tampoco hay que ir a buscarlas.
export class MongoColaboradorRepository {
  async guardar(colaborador) {
    return colaborador.save();
  }

  async buscarPorId(id) {
    return esIdValido(id) ? ColaboradorModel.findById(id) : null;
  }

  async listar() {
    return ColaboradorModel.find().sort({ _id: 1 });
  }

  // Las que tienen TODAS las habilidades pedidas: $all compara contra los
  // codigos guardados, sin traer a memoria a las que no califican.
  async buscarPorHabilidades(codigos) {
    return ColaboradorModel.find({ "habilidades.codigo": { $all: codigos } }).sort({
      _id: 1,
    });
  }

  // Colaboradoras potenciales para un perfil: tienen TODAS las requeridas,
  // no estan ya en el proyecto y van primero las que tienen mas opcionales.
  // La base filtra, ordena y pagina: a la API llega solo la pagina pedida.
  async buscarPotenciales(
    { requeridas, opcionales = [], excluirIds = [] },
    numeroPagina,
    limitePorPagina,
  ) {
    const salto = (numeroPagina - 1) * limitePorPagina;

    const [resultado] = await ColaboradorModel.aggregate([
      // 1. Tiene todas las requeridas y no se postulo todavia.
      {
        $match: {
          "habilidades.codigo": { $all: requeridas },
          _id: { $nin: excluirIds.map(aObjectId) },
        },
      },
      // 2. Cuantas opcionales tiene: la interseccion de sus codigos con los
      //    opcionales del perfil, y el tamaño de esa interseccion.
      {
        $addFields: {
          cantidadDeOpcionales: {
            $size: {
              $setIntersection: [{ $ifNull: ["$habilidades.codigo", []] }, opcionales],
            },
          },
        },
      },
      // 3. Primero las que cumplen mas opcionales; el _id desempata, para que
      //    dos paginas seguidas no se pisen.
      { $sort: { cantidadDeOpcionales: -1, _id: 1 } },
      // 4. La pagina y el total, en una sola consulta.
      {
        $facet: {
          items: [{ $skip: salto }, { $limit: limitePorPagina }],
          total: [{ $count: "cantidad" }],
        },
      },
    ]);

    return {
      // aggregate devuelve objetos planos: hydrate les devuelve los metodos y
      // el toJSON del modelo (que oculta los medios de contacto).
      items: resultado.items.map(({ cantidadDeOpcionales: _, ...documento }) => {
        const colaborador = ColaboradorModel.hydrate(documento);
        return {
          colaborador,
          // En el orden en que las pide el perfil (solo sobre la pagina).
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
