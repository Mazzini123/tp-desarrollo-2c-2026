import { AccionAdministrativaModel } from "../models/AccionAdministrativaModel.js";
import { aObjectId } from "./objectIds.js";
import { paginar } from "./paginar.js";

const MAS_RECIENTE_PRIMERO = { fecha: -1, _id: -1 };

export class MongoAuditoriaRepository {
  async registrar(datos) {
    return AccionAdministrativaModel.create(datos);
  }

  async listarPaginado(pagina, { accion, entidadTipo, entidadId, desde, hasta } = {}) {
    const filtro = {};
    if (accion) filtro.accion = accion;
    if (entidadTipo) filtro["entidad.tipo"] = entidadTipo;
    if (entidadId) filtro["entidad.id"] = aObjectId(entidadId);
    if (desde || hasta) {
      filtro.fecha = { ...(desde && { $gte: desde }), ...(hasta && { $lte: hasta }) };
    }
    return paginar(AccionAdministrativaModel, filtro, pagina, {
      orden: MAS_RECIENTE_PRIMERO,
      ajustar: (consulta) => consulta.lean(),
    });
  }
}
