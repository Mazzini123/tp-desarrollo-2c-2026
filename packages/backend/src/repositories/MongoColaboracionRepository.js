import { ColaboracionModel } from "../models/ColaboracionModel.js";
import { aObjectId, esIdValido } from "./objectIds.js";
import { COLABORACION_ESTADO } from "../domain/enums/COLABORACION_ESTADO.js";
import { paginar } from "./paginar.js";

const CRONOLOGICO = { fecha: 1, _id: 1 };
const CAMPOS_PUBLICOS_DE_COLABORADOR =
  "nombreFantasia nombre apellido cuentaGit presentacion pronombres recibeMensajeriaInterna redesSociales habilidades fechaBaja";

const colaboradorSiEsPublica = (select) => ({
  path: "colaborador",
  match: (c) => (c.esPublica ? {} : { _id: null }),
  select,
});

export class MongoColaboracionRepository {
  async pendientesDeColectivo(colectivoId, pagina) {
    return paginar(
      ColaboracionModel,
      { colectivoId, estado: COLABORACION_ESTADO.PENDIENTE },
      pagina,
      {
        orden: { fecha: -1, _id: -1 },
        ajustar: (consulta) =>
          consulta.populate(
            colaboradorSiEsPublica(
              "nombreFantasia nombre apellido cuentaGit habilidades",
            ),
          ),
      },
    );
  }

  async contarAceptadasPorPerfil(proyectoId) {
    const filas = await ColaboracionModel.aggregate([
      {
        $match: {
          proyectoId: aObjectId(proyectoId),
          estado: COLABORACION_ESTADO.ACEPTADA,
        },
      },
      { $group: { _id: "$perfil", cantidad: { $sum: 1 } } },
    ]);
    return new Map(filas.map((f) => [String(f._id), f.cantidad]));
  }

  async contarPendientesPorProyecto(proyectoIds) {
    if (proyectoIds.length === 0) return new Map();
    const filas = await ColaboracionModel.aggregate([
      {
        $match: {
          proyectoId: { $in: proyectoIds.map(aObjectId) },
          estado: COLABORACION_ESTADO.PENDIENTE,
        },
      },
      { $group: { _id: "$proyectoId", cantidad: { $sum: 1 } } },
    ]);
    return new Map(filas.map((f) => [String(f._id), f.cantidad]));
  }

  async listarDeProyecto(proyectoId, pagina, { privadas = false, estado } = {}) {
    const filtro = { proyectoId };
    if (!privadas) {
      filtro.estado = {
        $in: [COLABORACION_ESTADO.ACEPTADA, COLABORACION_ESTADO.FINALIZADA],
      };
    } else if (estado) {
      filtro.estado = estado;
    }
    return paginar(ColaboracionModel, filtro, pagina, {
      orden: CRONOLOGICO,
      ajustar: (consulta) =>
        consulta.populate(colaboradorSiEsPublica(CAMPOS_PUBLICOS_DE_COLABORADOR)),
    });
  }

  async buscarDeColaborador(colaboradorId) {
    if (!esIdValido(colaboradorId)) return [];
    return ColaboracionModel.find({ colaborador: colaboradorId })
      .sort(CRONOLOGICO)
      .populate("colaborador");
  }

  async buscarEnProyecto(proyectoId, colaboracionId) {
    if (!esIdValido(colaboracionId)) return null;
    return ColaboracionModel.findOne({ _id: colaboracionId, proyectoId })
      .select("colaborador")
      .lean();
  }

  async valoradasPorColectivos(colaboradorId) {
    if (!esIdValido(colaboradorId)) return [];
    return ColaboracionModel.find({
      colaborador: colaboradorId,
      esPublica: true,
      valoracionDelColectivo: { $ne: null },
    })
      .select("proyectoId valoracionDelColectivo")
      .sort(CRONOLOGICO);
  }

  async valoradasPorColaboradoras(colectivoId) {
    if (!esIdValido(colectivoId)) return [];
    return ColaboracionModel.find({
      colectivoId,
      valoracionDelColaborador: { $ne: null },
    })
      .select("proyectoId colaborador esPublica valoracionDelColaborador")
      .sort(CRONOLOGICO)
      .populate({ path: "colaborador", select: CAMPOS_PUBLICOS_DE_COLABORADOR });
  }

  async finalizadasDeColectivo(colectivoId) {
    if (!esIdValido(colectivoId)) return [];
    return ColaboracionModel.find({ colectivoId, estado: COLABORACION_ESTADO.FINALIZADA })
      .select("proyectoId colaborador esPublica fechaFin")
      .sort(CRONOLOGICO)
      .populate({
        path: "colaborador",
        select: "nombreFantasia nombre apellido cuentaGit",
      });
  }
}
