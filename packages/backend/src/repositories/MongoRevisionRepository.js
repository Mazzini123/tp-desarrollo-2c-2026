import { RevisionModel } from "../models/RevisionModel.js";
import { ESTADO_REVISION } from "../domain/enums/ESTADO_REVISION.js";
import { esDuplicado } from "./duplicados.js";
import { aObjectId, esIdValido } from "./objectIds.js";
import { paginar } from "./paginar.js";

const MAS_RECIENTE_PRIMERO = { creadaEn: -1, _id: -1 };

export class MongoRevisionRepository {
  async crearPendiente({ proyectoId, motivo, creadaEn }) {
    try {
      return await RevisionModel.create({ proyectoId, motivo, creadaEn });
    } catch (error) {
      if (esDuplicado(error)) return null;
      throw error;
    }
  }

  async buscarPorId(id) {
    return esIdValido(id) ? RevisionModel.findById(id).lean() : null;
  }

  async resolverSiPendiente(id, { estado, nota, resueltaPor, resueltaEn }) {
    return RevisionModel.findOneAndUpdate(
      { _id: id, estado: ESTADO_REVISION.PENDIENTE },
      { $set: { estado, nota, resueltaPor, resueltaEn } },
      { returnDocument: "after", lean: true },
    );
  }

  async descartarPendientesDeProyecto(proyectoId, { nota, resueltaPor, resueltaEn }) {
    await RevisionModel.updateMany(
      { proyectoId, estado: ESTADO_REVISION.PENDIENTE },
      { $set: { estado: ESTADO_REVISION.DESCARTADA, nota, resueltaPor, resueltaEn } },
    );
  }

  async ultimaResolucionPorProyecto(proyectoIds, motivo) {
    const filas = await RevisionModel.aggregate([
      {
        $match: {
          proyectoId: { $in: proyectoIds.map(aObjectId) },
          motivo,
          estado: { $ne: ESTADO_REVISION.PENDIENTE },
        },
      },
      { $group: { _id: "$proyectoId", resueltaEn: { $max: "$resueltaEn" } } },
    ]);
    return new Map(filas.map((fila) => [String(fila._id), fila.resueltaEn]));
  }

  async listarPaginado(pagina, { estado, motivo } = {}) {
    const filtro = {};
    if (estado) filtro.estado = estado;
    if (motivo) filtro.motivo = motivo;
    return paginar(RevisionModel, filtro, pagina, {
      orden: MAS_RECIENTE_PRIMERO,
      ajustar: (consulta) => consulta.lean(),
    });
  }
}
