import { ColaboracionModel } from "../models/ColaboracionModel.js";
import { esIdValido } from "./objectIds.js";

const CRONOLOGICO = { fecha: 1, _id: 1 };

export class MongoColaboracionRepository {
  async buscarDeColaborador(colaboradorId) {
    if (!esIdValido(colaboradorId)) return [];
    return ColaboracionModel.find({ colaborador: colaboradorId })
      .sort(CRONOLOGICO)
      .populate("colaborador");
  }

  async buscarDeColectivo(colectivoId) {
    if (!esIdValido(colectivoId)) return [];
    return ColaboracionModel.find({ colectivoId })
      .sort(CRONOLOGICO)
      .populate("colaborador");
  }

  async idsDeProyectosDe(colaboradorId) {
    return ColaboracionModel.distinct("proyectoId", { colaborador: colaboradorId });
  }

  async idsDeColaboradoresDe(proyectoId) {
    return ColaboracionModel.distinct("colaborador", { proyectoId });
  }
}
