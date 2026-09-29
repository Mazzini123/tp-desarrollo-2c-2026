// Pipelines del Aggregation Framework de MongoDB para las estadisticas
// (requerimientos adicionales 16, 17 y 30). Son funciones puras que arman
// el pipeline: el repositorio los ejecuta con Model.aggregate().
//
// Cada etapa transforma la lista de documentos que le llega:
//
//   colectivos ──$unwind proyectos──> un documento por proyecto
//              ──$group por estado──> un documento por estado, con la cuenta
//
// Asi el conteo lo hace la base y a la API solo le llega el resultado.

// Dado de baja = tiene una fecha en fechaBaja. $type distingue sin ambiguedad
// una fecha ("date") de un null ("null") o de un campo que no existe
// ("missing", en los colectivos guardados antes de esta entrega).
const estaDadoDeBaja = { $eq: [{ $type: "$fechaBaja" }, "date"] };

export function colectivosPorEstado() {
  return [
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        dadosDeBaja: { $sum: { $cond: [estaDadoDeBaja, 1, 0] } },
      },
    },
  ];
}

export function proyectosPorEstado() {
  return [
    { $unwind: "$proyectos" },
    { $group: { _id: "$proyectos.estado", cantidad: { $sum: 1 } } },
  ];
}

// Agrupa por estado y por si es publica o anonima a la vez: con un solo
// recorrido salen los dos numeros.
export function colaboracionesPorEstado() {
  return [
    { $unwind: "$proyectos" },
    { $unwind: "$proyectos.colaboraciones" },
    {
      $group: {
        _id: {
          estado: "$proyectos.colaboraciones.estado",
          esPublica: "$proyectos.colaboraciones.esPublica",
        },
        cantidad: { $sum: 1 },
      },
    },
  ];
}

// La demanda: que habilidades piden mas los perfiles de los proyectos.
export function habilidadesMasRequeridas(limite) {
  return [
    { $unwind: "$proyectos" },
    { $unwind: "$proyectos.perfiles" },
    { $unwind: "$proyectos.perfiles.codigosHabilidadesRequeridas" },
    { $group: { _id: "$proyectos.perfiles.codigosHabilidadesRequeridas", cantidad: { $sum: 1 } } },
    // El _id desempata, para que el orden sea siempre el mismo.
    { $sort: { cantidad: -1, _id: 1 } },
    { $limit: limite },
  ];
}

// La oferta: que habilidades tienen mas personas (sobre la coleccion de
// colaboradores).
export function habilidadesMasOfrecidas(limite) {
  return [
    { $unwind: "$codigosHabilidades" },
    { $group: { _id: "$codigosHabilidades", cantidad: { $sum: 1 } } },
    { $sort: { cantidad: -1, _id: 1 } },
    { $limit: limite },
  ];
}

export function contar() {
  return [{ $count: "total" }];
}

// Requerimiento adicional 17: el panel de una organizacion. $facet corre
// tres sub-pipelines sobre los mismos proyectos y devuelve los tres
// resultados en una sola consulta.
export function estadisticasDeColectivo(colectivoId) {
  const lista = (campo) => ({ $ifNull: [`$${campo}`, []] });

  return [
    { $match: { _id: colectivoId } },
    { $unwind: "$proyectos" },
    // De aca en adelante, cada documento ES un proyecto.
    { $replaceRoot: { newRoot: "$proyectos" } },
    {
      $facet: {
        totales: [
          {
            $group: {
              _id: null,
              proyectos: { $sum: 1 },
              abiertos: { $sum: { $cond: [{ $eq: ["$estado", "ABIERTO"] }, 1, 0] } },
              visualizaciones: { $sum: { $ifNull: ["$visualizaciones", 0] } },
              avancePromedio: { $avg: { $ifNull: ["$porcentajeConcrecion", 0] } },
              logros: { $sum: { $size: lista("logros") } },
            },
          },
        ],
        colaboracionesPorEstado: [
          { $unwind: "$colaboraciones" },
          { $group: { _id: "$colaboraciones.estado", cantidad: { $sum: 1 } } },
        ],
        porProyecto: [
          {
            $project: {
              _id: 0,
              id: "$_id",
              titulo: 1,
              estado: 1,
              visualizaciones: { $ifNull: ["$visualizaciones", 0] },
              porcentajeConcrecion: { $ifNull: ["$porcentajeConcrecion", 0] },
              logros: { $size: lista("logros") },
              colaboraciones: { $size: lista("colaboraciones") },
            },
          },
          { $sort: { titulo: 1 } },
        ],
      },
    },
  ];
}
