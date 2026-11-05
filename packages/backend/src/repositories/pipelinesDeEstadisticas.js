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

import { aObjectId } from "./ids.js";

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

export function habilidadesMasRequeridas(limite) {
  return [
    { $unwind: "$proyectos" },
    { $unwind: "$proyectos.perfiles" },
    { $unwind: "$proyectos.perfiles.habilidadesRequeridas" },
    {
      $group: {
        _id: "$proyectos.perfiles.habilidadesRequeridas.codigo",
        cantidad: { $sum: 1 },
      },
    },
    { $sort: { cantidad: -1, _id: 1 } },
    { $limit: limite },
  ];
}

export function habilidadesMasOfrecidas(limite) {
  return [
    { $unwind: "$habilidades" },
    { $group: { _id: "$habilidades.codigo", cantidad: { $sum: 1 } } },
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
    { $match: { _id: aObjectId(colectivoId) } },
    { $unwind: "$proyectos" },
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
