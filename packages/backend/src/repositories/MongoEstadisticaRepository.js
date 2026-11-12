import { ColectivoModel } from "../models/ColectivoModel.js";
import { ColaboradorModel } from "../models/ColaboradorModel.js";
import { ProyectoModel } from "../models/ProyectoModel.js";
import { ColaboracionModel } from "../models/ColaboracionModel.js";
import { aObjectId } from "./objectIds.js";
import * as pipelines from "./pipelinesDeEstadisticas.js";

const TOPE_DE_HABILIDADES = 5;

const aMapa = (filas) => Object.fromEntries(filas.map((f) => [f._id, f.cantidad]));
const aRanking = (filas) => filas.map((f) => ({ codigo: f._id, cantidad: f.cantidad }));

export class MongoEstadisticaRepository {
  async globales() {
    const [colectivos, proyectos, colaboraciones, colaboradores, requeridas, ofrecidas] =
      await Promise.all([
        ColectivoModel.aggregate(pipelines.colectivosPorEstado()),
        ProyectoModel.aggregate(pipelines.proyectosPorEstado()),
        ColaboracionModel.aggregate(pipelines.colaboracionesPorEstado()),
        ColaboradorModel.aggregate(pipelines.contar()),
        ProyectoModel.aggregate(pipelines.habilidadesMasRequeridas(TOPE_DE_HABILIDADES)),
        ColaboradorModel.aggregate(
          pipelines.habilidadesMasOfrecidas(TOPE_DE_HABILIDADES),
        ),
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
    const [[resultado], porEstado] = await Promise.all([
      ProyectoModel.aggregate(pipelines.estadisticasDeColectivo(colectivoId)),
      ColaboracionModel.aggregate(
        pipelines.colaboracionesPorEstado({ colectivoId: aObjectId(colectivoId) }),
      ),
    ]);

    const colaboracionesPorEstado = {};
    for (const { _id, cantidad } of porEstado) {
      colaboracionesPorEstado[_id.estado] =
        (colaboracionesPorEstado[_id.estado] ?? 0) + cantidad;
    }

    return {
      totales: resultado?.totales[0] ?? null,
      colaboracionesPorEstado,
      porProyecto: resultado?.porProyecto ?? [],
    };
  }
}
