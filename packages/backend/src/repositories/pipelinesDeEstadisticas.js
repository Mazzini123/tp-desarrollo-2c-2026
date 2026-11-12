import { aObjectId } from "./objectIds.js";
import { PROYECTO_ESTADO } from "../domain/enums/PROYECTO_ESTADO.js";

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
  return [{ $group: { _id: "$estado", cantidad: { $sum: 1 } } }];
}

export function colaboracionesPorEstado(filtro = {}) {
  return [
    { $match: filtro },
    {
      $group: {
        _id: { estado: "$estado", esPublica: "$esPublica" },
        cantidad: { $sum: 1 },
      },
    },
  ];
}

export function habilidadesMasRequeridas(limite) {
  return [
    { $unwind: "$perfiles" },
    { $unwind: "$perfiles.habilidadesRequeridas" },
    {
      $group: {
        _id: "$perfiles.habilidadesRequeridas.codigo",
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

export function estadisticasDeColectivo(colectivoId) {
  const lista = (campo) => ({ $ifNull: [`$${campo}`, []] });

  return [
    { $match: { colectivoId: aObjectId(colectivoId) } },
    {
      $lookup: {
        from: "colaboraciones",
        localField: "_id",
        foreignField: "proyectoId",
        pipeline: [{ $project: { _id: 1 } }],
        as: "colaboraciones",
      },
    },
    {
      $facet: {
        totales: [
          {
            $group: {
              _id: null,
              proyectos: { $sum: 1 },
              abiertos: {
                $sum: { $cond: [{ $eq: ["$estado", PROYECTO_ESTADO.ABIERTO] }, 1, 0] },
              },
              visualizaciones: { $sum: { $ifNull: ["$visualizaciones", 0] } },
              avancePromedio: { $avg: { $ifNull: ["$porcentajeConcrecion", 0] } },
              logros: { $sum: { $size: lista("logros") } },
            },
          },
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
              colaboraciones: { $size: "$colaboraciones" },
            },
          },
          { $sort: { titulo: 1 } },
        ],
      },
    },
  ];
}
