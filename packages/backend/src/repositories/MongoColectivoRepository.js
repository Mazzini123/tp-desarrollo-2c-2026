import { ColectivoModel } from "../models/ColectivoModel.js";
import { aObjectId, esIdValido } from "./ids.js";

// Orden estable para paginar: primero por fecha de alta, y el _id desempata.
const ORDEN = { createdAt: 1, _id: 1 };

// Las colaboraciones guardan solo el ObjectId del colaborador. populate lo
// reemplaza por el documento completo (un Colaborador con sus metodos) con
// UNA consulta extra para toda la tanda, no una por colaboracion.
const COLABORADORES = { path: "proyectos.colaboraciones.colaborador" };

// --- Condiciones de buscarProyectosCompatibles (despues del $unwind, cada
// documento tiene UN proyecto en "$proyectos") ---

// $ifNull: si un documento viejo no tiene el array, cuenta como vacio en vez
// de hacer fallar toda la consulta ($size de algo que no existe es un error).
const lista = (campo) => ({ $ifNull: [campo, []] });

// Proyecto.cupoCompleto() al reves: sin limite, o con menos aceptadas que el
// limite.
const TIENE_CUPO = {
  $or: [
    { $eq: [{ $ifNull: ["$proyectos.limiteVacantes", null] }, null] },
    {
      $lt: [
        {
          $size: {
            $filter: {
              input: lista("$proyectos.colaboraciones"),
              cond: { $eq: ["$$this.estado", "ACEPTADA"] },
            },
          },
        },
        "$proyectos.limiteVacantes",
      ],
    },
  ],
};

// Proyecto.cumpleAlgunPerfil(): algun perfil con requeridas, y todas ellas
// ($setIsSubset) entre las habilidades de la persona.
function algunPerfilQueCumple(codigosDeLaPersona) {
  return {
    $anyElementTrue: [
      {
        $map: {
          input: lista("$proyectos.perfiles"),
          as: "perfil",
          in: {
            $and: [
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

// Sin traduccion dominio <-> documento: lo que devuelve Mongoose ya es un
// Colectivo con sus proyectos, y cada proyecto ya es un Proyecto (loadClass).
export class MongoColectivoRepository {
  // Se guarda el documento entero (es el agregado). Con
  // optimisticConcurrency, save() falla si otro pedido lo modifico antes.
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
    // Sobre un array, { etiquetas: "x" } matchea si "x" es uno de sus elementos.
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

  // Devuelve el proyecto que esta DENTRO del colectivo (el mismo
  // subdocumento). Los services lo modifican y despues guardan el colectivo:
  // si fueran dos objetos distintos, el cambio se perderia.
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

  // Suma una visualizacion sin leer ni reescribir el colectivo: $inc lo hace
  // la base, y "proyectos.$" apunta al proyecto que matcheo el filtro.
  async registrarVisualizacion(proyectoId) {
    if (!esIdValido(proyectoId)) {
      return;
    }

    await ColectivoModel.updateOne(
      { "proyectos._id": proyectoId },
      { $inc: { "proyectos.$.visualizaciones": 1 } },
      // Sin esto, Mongoose agregaria updatedAt y tocaria el colectivo entero.
      { timestamps: false },
    );
  }

  async buscarPerfil(proyectoId, perfilId) {
    const encontrado = await this.buscarProyecto(proyectoId);
    const perfil = encontrado?.proyecto.buscarPerfil(perfilId);

    return perfil ? { ...encontrado, perfil } : null;
  }

  // Preselecciona los colectivos que PUEDEN tener un proyecto vencido: alguno
  // abierto y alguno con fecha de cierre pasada (no necesariamente el mismo).
  // La condicion exacta la decide el dominio (Proyecto.cierreVencido) en el
  // service; traer de mas solo cuesta un poco, nunca cierra algo que no toca.
  async buscarConCierreVencido(ahora) {
    return ColectivoModel.find({
      "proyectos.estado": "ABIERTO",
      "proyectos.fechaCierre": { $lte: ahora },
    }).populate(COLABORADORES);
  }

  // Los colectivos en los que la persona tiene alguna colaboracion.
  async buscarColectivosDeColaborador(colaboradorId) {
    if (!esIdValido(colaboradorId)) {
      return [];
    }

    return ColectivoModel.find({ "proyectos.colaboraciones.colaborador": colaboradorId })
      .sort(ORDEN)
      .populate(COLABORADORES);
  }

  // Proyectos potenciales para una persona: abiertos, con cupo, con algun
  // perfil cuyas habilidades requeridas tenga todas, y a los que no se
  // postulo todavia. Es la misma regla que Proyecto.aceptaPostulaciones(),
  // cumpleAlgunPerfil() y yaColaboraron(), escrita como consulta para que la
  // base filtre y pagine en vez de traer todos los colectivos a memoria.
  async buscarProyectosCompatibles(colaborador, numeroPagina, limitePorPagina) {
    const salto = (numeroPagina - 1) * limitePorPagina;
    const codigosDeLaPersona = colaborador.habilidades.map((h) => h.codigo);

    const [resultado] = await ColectivoModel.aggregate([
      { $sort: ORDEN },
      // Un documento por proyecto.
      { $unwind: "$proyectos" },
      {
        $match: {
          // aceptaPostulaciones(): abierto...
          "proyectos.estado": "ABIERTO",
          // !yaColaboraron(): sobre un array, $ne exige que NINGUNA
          // colaboracion sea de ella.
          "proyectos.colaboraciones.colaborador": { $ne: aObjectId(colaborador) },
          // ...y con cupo; cumpleAlgunPerfil().
          $expr: { $and: [TIENE_CUPO, algunPerfilQueCumple(codigosDeLaPersona)] },
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
    // Despues del $unwind cada documento es un proyecto: se filtra por las
    // etiquetas del proyecto, no por las del colectivo.
    const filtroPorEtiqueta = etiqueta
      ? [{ $match: { "proyectos.etiquetas": etiqueta } }]
      : [];

    // Los proyectos estan embebidos, asi que no se pueden paginar con un find.
    // $unwind "abre" cada colectivo en un documento por proyecto, y $facet
    // calcula la pagina y el total en una sola consulta.
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

// aggregate() devuelve objetos planos, sin metodos. hydrate() los convierte
// en documentos de Mongoose (con loadClass, o sea con los metodos de
// dominio), y despues se pueblan los colaboradores en una sola consulta.
//
// Cada fila es { _id del colectivo, proyectos: <UN proyecto> }: se arma un
// colectivo con ese unico proyecto y se devuelve el proyecto.
export async function proyectosDesdeAgregacion(filas) {
  const colectivos = filas.map((fila) =>
    ColectivoModel.hydrate({ _id: fila._id, proyectos: [fila.proyectos] }),
  );
  await ColectivoModel.populate(colectivos, COLABORADORES);
  return colectivos.map((colectivo) => colectivo.proyectos[0]);
}
