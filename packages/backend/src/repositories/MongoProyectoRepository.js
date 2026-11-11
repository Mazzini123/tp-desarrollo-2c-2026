import mongoose from "mongoose";
import { ProyectoModel } from "../models/ProyectoModel.js";
import { ColaboracionModel } from "../models/ColaboracionModel.js";
import { transaccionesMongo } from "../config/transacciones.js";
import { ConcurrenciaError } from "../errors/ConcurrenciaError.js";
import { PROYECTO_ESTADO } from "../domain/enums/PROYECTO_ESTADO.js";
import { errorDeDuplicado, esDuplicado } from "./duplicados.js";
import { esIdValido } from "./objectIds.js";
import { paginar } from "./paginar.js";
import { COLABORACION_ESTADO } from "../domain/enums/COLABORACION_ESTADO.js";

const ORDEN = { fechaCreacion: 1, _id: 1 };
const CAMPOS_DE_RESUMEN =
  "titulo descripcion estado porcentajeConcrecion perfiles etiquetas fechaCreacion fechaCierre colectivoId datosDelColectivo";

export class MongoProyectoRepository {
  nuevo(datos) {
    return new ProyectoModel(datos);
  }

  nuevaColaboracion(proyecto, datos) {
    return new ColaboracionModel({
      ...datos,
      proyectoId: proyecto._id,
      colectivoId: proyecto.colectivoId,
    });
  }

  async guardar(proyecto) {
    if (typeof proyecto.save !== "function")
      throw new Error(
        "Guardar requiere un proyecto completo, no una respuesta de lectura",
      );
    const cambiadas = proyecto.colaboraciones.filter((c) => c.isNew || c.isModified());
    const guardar = async () => {
      for (const perfil of proyecto.perfiles) {
        perfil.cupoCompleto = perfil.limiteAlcanzado(proyecto.cantidadAceptadas(perfil));
      }
      if (!proyecto.isNew) proyecto.increment();
      try {
        await proyecto.save();
      } catch (error) {
        if (error instanceof mongoose.Error.VersionError) throw new ConcurrenciaError();
        if (esDuplicado(error)) throw errorDeDuplicado("La publicacion ya existe");
        throw error;
      }
      for (const colaboracion of cambiadas) {
        await colaboracion.save();
      }
      return proyecto;
    };

    return cambiadas.length ? transaccionesMongo.ejecutar(guardar) : guardar();
  }

  async ultimoId() {
    return (await ProyectoModel.findOne().sort({ _id: -1 }).select("_id"))?._id ?? null;
  }

  async buscarSinColaboraciones(id) {
    return esIdValido(id) ? ProyectoModel.findById(id) : null;
  }

  async buscarParaDetalle(id) {
    return esIdValido(id) ? ProyectoModel.findById(id).lean() : null;
  }

  async buscarPorId(id) {
    if (!esIdValido(id)) return null;
    const proyecto = await ProyectoModel.findById(id);
    return proyecto ? (await this.conColaboraciones([proyecto]))[0] : null;
  }

  async buscarVarios(ids) {
    return ProyectoModel.find({ _id: { $in: ids } })
      .select("titulo estado colectivoId datosDelColectivo perfiles")
      .sort(ORDEN);
  }

  async buscarTitulos(ids) {
    return ProyectoModel.find({ _id: { $in: ids } }).select(
      "titulo colectivoId datosDelColectivo",
    );
  }

  async buscarParaTimeline(colectivoId) {
    if (!esIdValido(colectivoId)) return [];
    return ProyectoModel.find({ colectivoId })
      .select("titulo fechaCreacion fechaFinalizacion logros avances")
      .sort(ORDEN)
      .lean();
  }

  async buscarColectivoId(id) {
    if (!esIdValido(id)) return null;
    const proyecto = await ProyectoModel.findById(id).select("colectivoId").lean();
    return proyecto?.colectivoId ?? null;
  }

  async contarPerfilesAbiertos(colectivoId, ahora = new Date()) {
    const resultado = await ProyectoModel.aggregate([
      {
        $match: {
          colectivoId: new mongoose.Types.ObjectId(colectivoId),
          estado: PROYECTO_ESTADO.ABIERTO,
          $or: [{ fechaCierre: null }, { fechaCierre: { $gt: ahora } }],
        },
      },
      { $unwind: "$perfiles" },
      {
        $match: {
          "perfiles.busquedaAbierta": { $ne: false },
          "perfiles.cupoCompleto": { $ne: true },
          $or: [
            { "perfiles.fechaCierreBusqueda": null },
            { "perfiles.fechaCierreBusqueda": { $gt: ahora } },
          ],
        },
      },
      { $count: "total" },
    ]);
    return resultado[0]?.total ?? 0;
  }

  async buscarPorColectivo(colectivoId) {
    if (!esIdValido(colectivoId)) return [];
    return this.conColaboraciones(await ProyectoModel.find({ colectivoId }).sort(ORDEN));
  }

  async buscarPorClaveDePublicacion(colectivoId, clave) {
    const proyecto = await ProyectoModel.findOne({
      colectivoId,
      "idempotenciaPublicacion.clave": clave,
    });
    return proyecto ? (await this.conColaboraciones([proyecto]))[0] : null;
  }

  async buscarConCierreVencido(ahora) {
    return ProyectoModel.find({
      estado: PROYECTO_ESTADO.ABIERTO,
      fechaCierre: { $lte: ahora },
    })
      .select("_id")
      .sort(ORDEN);
  }

  async registrarVisualizacion(proyectoId) {
    if (!esIdValido(proyectoId)) return;
    const actualizado = await ProyectoModel.findByIdAndUpdate(
      proyectoId,
      { $inc: { visualizaciones: 1 } },
      { returnDocument: "after", projection: { visualizaciones: 1 } },
    );
    return actualizado?.visualizaciones;
  }

  async actualizarDatosDelColectivo(colectivo) {
    await ProyectoModel.updateMany(
      { colectivoId: colectivo._id },
      {
        $set: {
          datosDelColectivo: {
            nombre: colectivo.nombre,
            tipoColectivo: colectivo.tipoColectivo,
            ubicacion: colectivo.ubicacion ?? null,
          },
        },
      },
    );
  }

  async listarPaginado(pagina, filtros = {}) {
    return this.paginarResumenes(filtroDeListado(filtros), pagina);
  }

  async contarPorColectivos(ids) {
    const filas = await ProyectoModel.aggregate([
      { $match: { colectivoId: { $in: ids } } },
      { $group: { _id: "$colectivoId", cantidad: { $sum: 1 } } },
    ]);
    return new Map(filas.map((fila) => [String(fila._id), fila.cantidad]));
  }

  async listarPorColectivoPaginado(colectivoId, pagina) {
    return this.paginarResumenes({ colectivoId }, pagina);
  }

  async paginarResumenes(filtro, pagina) {
    return paginar(ProyectoModel, filtro, pagina, {
      orden: ORDEN,
      ajustar: (consulta) => consulta.select(CAMPOS_DE_RESUMEN).lean(),
    });
  }

  async buscarCompatibles(colaborador, pagina, { ahora = new Date(), hastaId } = {}) {
    const codigos = colaborador.habilidades.map((h) => h.codigo);
    const perfilesOcupados = await ColaboracionModel.distinct("perfil", {
      colaborador: colaborador._id,
      estado: { $ne: COLABORACION_ESTADO.RETIRADA },
    });
    const filtro = {
      estado: PROYECTO_ESTADO.ABIERTO,
      $or: [{ fechaCierre: null }, { fechaCierre: { $gt: ahora } }],
      perfiles: {
        $elemMatch: {
          _id: { $nin: perfilesOcupados },
          busquedaAbierta: { $ne: false },
          cupoCompleto: { $ne: true },
          $or: [{ fechaCierreBusqueda: null }, { fechaCierreBusqueda: { $gt: ahora } }],
          "habilidadesRequeridas.0": { $exists: true },
          habilidadesRequeridas: { $not: { $elemMatch: { codigo: { $nin: codigos } } } },
        },
      },
    };
    if (hastaId) filtro._id = { $lte: hastaId };
    return this.paginarResumenes(filtro, pagina);
  }

  async conColaboraciones(proyectos) {
    if (proyectos.length === 0) return proyectos;
    const colaboraciones = await ColaboracionModel.find({
      proyectoId: { $in: proyectos.map((p) => p._id) },
    })
      .sort({ fecha: 1, _id: 1 })
      .populate("colaborador");
    const porProyecto = new Map();
    for (const colaboracion of colaboraciones) {
      const id = String(colaboracion.proyectoId);
      if (!porProyecto.has(id)) porProyecto.set(id, []);
      porProyecto.get(id).push(colaboracion);
    }
    for (const proyecto of proyectos)
      proyecto.colaboraciones = porProyecto.get(proyecto.id) ?? [];
    return proyectos;
  }
}

function filtroDeListado({
  etiqueta,
  estado,
  habilidad,
  tipoColectivo,
  ubicacion,
  modalidad,
}) {
  const filtro = {};
  if (etiqueta) filtro.etiquetas = etiqueta;
  if (estado) filtro.estado = estado;
  if (tipoColectivo) filtro["datosDelColectivo.tipoColectivo"] = tipoColectivo;
  if (ubicacion) filtro["datosDelColectivo.ubicacion.nombre"] = ubicacion;
  if (modalidad) filtro["perfiles.modalidadColaboracion"] = modalidad;
  if (habilidad) {
    filtro.$or = [
      { "perfiles.habilidadesRequeridas.codigo": habilidad },
      { "perfiles.habilidadesOpcionales.codigo": habilidad },
    ];
  }
  return filtro;
}
