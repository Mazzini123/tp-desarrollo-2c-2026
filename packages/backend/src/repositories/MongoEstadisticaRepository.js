import { ColectivoModel } from "../models/ColectivoModel.js";
import { ColaboradorModel } from "../models/ColaboradorModel.js";
import * as pipelines from "./pipelinesDeEstadisticas.js";

const TOPE_DE_HABILIDADES = 5;

// Los $group devuelven [{ _id, cantidad }]: se pasan a { clave: cantidad }.
const aMapa = (filas) => Object.fromEntries(filas.map((f) => [f._id, f.cantidad]));
const aRanking = (filas) => filas.map((f) => ({ codigo: f._id, cantidad: f.cantidad }));

export class MongoEstadisticaRepository {
  async globales() {
    // Son consultas independientes: se lanzan en paralelo.
    const [colectivos, proyectos, colaboraciones, colaboradores, requeridas, ofrecidas] =
      await Promise.all([
        ColectivoModel.aggregate(pipelines.colectivosPorEstado()),
        ColectivoModel.aggregate(pipelines.proyectosPorEstado()),
        ColectivoModel.aggregate(pipelines.colaboracionesPorEstado()),
        ColaboradorModel.aggregate(pipelines.contar()),
        ColectivoModel.aggregate(pipelines.habilidadesMasRequeridas(TOPE_DE_HABILIDADES)),
        ColaboradorModel.aggregate(pipelines.habilidadesMasOfrecidas(TOPE_DE_HABILIDADES)),
      ]);

    return {
      colectivos: {
        total: colectivos[0]?.total ?? 0,
        dadosDeBaja: colectivos[0]?.dadosDeBaja ?? 0,
      },
      proyectosPorEstado: aMapa(proyectos),
      colaboraciones: colaboraciones.map((f) => ({ ...f._id, cantidad: f.cantidad })),
      colaboradores: colaboradores[0]?.total ?? 0,
      habilidadesMasRequeridas: aRanking(requeridas),
      habilidadesMasOfrecidas: aRanking(ofrecidas),
    };
  }

  async deColectivo(colectivoId) {
    const [resultado] = await ColectivoModel.aggregate(
      pipelines.estadisticasDeColectivo(colectivoId),
    );

    // Un colectivo sin proyectos no pasa del $unwind: no llega nada.
    return {
      totales: resultado?.totales[0] ?? null,
      colaboracionesPorEstado: aMapa(resultado?.colaboracionesPorEstado ?? []),
      porProyecto: resultado?.porProyecto ?? [],
    };
  }
}
