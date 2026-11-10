import mongoose from "mongoose";
import { ProyectoModel } from "../models/ProyectoModel.js";
import { ColaboracionModel } from "../models/ColaboracionModel.js";
import { transaccionesMongo } from "../config/transacciones.js";
import { ConcurrenciaError } from "../errors/ConcurrenciaError.js";
import { PROYECTO_ESTADO } from "../domain/enums/PROYECTO_ESTADO.js";
import { errorDeDuplicado, esDuplicado } from "./duplicados.js";
import { esIdValido } from "./objectIds.js";
import { salto } from "../utils/paginacion.js";

const ORDEN = { fechaCreacion: 1, _id: 1 };

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

  async buscarPorId(id) {
    if (!esIdValido(id)) return null;
    const proyecto = await ProyectoModel.findById(id);
    return proyecto ? (await this.conColaboraciones([proyecto]))[0] : null;
  }

  async buscarVarios(ids) {
    return ProyectoModel.find({ _id: { $in: ids } }).sort(ORDEN);
  }

  async buscarPorColectivo(colectivoId) {
    if (!esIdValido(colectivoId)) return [];
    return this.conColaboraciones(await ProyectoModel.find({ colectivoId }).sort(ORDEN));
  }

  async buscarPorColectivos(colectivoIds) {
    return this.conColaboraciones(
      await ProyectoModel.find({ colectivoId: { $in: colectivoIds } }).sort(ORDEN),
    );
  }

  async buscarPorClaveDePublicacion(colectivoId, clave) {
    const proyecto = await ProyectoModel.findOne({
      colectivoId,
      "idempotenciaPublicacion.clave": clave,
    });
    return proyecto ? (await this.conColaboraciones([proyecto]))[0] : null;
  }

  async buscarConCierreVencido(ahora) {
    return this.conColaboraciones(
      await ProyectoModel.find({
        estado: PROYECTO_ESTADO.ABIERTO,
        fechaCierre: { $lte: ahora },
      }).sort(ORDEN),
    );
  }

  async registrarVisualizacion(proyectoId) {
    if (!esIdValido(proyectoId)) return;
    await ProyectoModel.updateOne({ _id: proyectoId }, { $inc: { visualizaciones: 1 } });
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

  async listarPaginado(numeroPagina, limitePorPagina, filtros = {}) {
    return this.paginar(filtroDeListado(filtros), numeroPagina, limitePorPagina);
  }

  async buscarCompatibles(
    colaborador,
    numeroPagina,
    limitePorPagina,
    ahora = new Date(),
  ) {
    const codigos = colaborador.habilidades.map((h) => h.codigo);
    const yaSePostulo = await ColaboracionModel.distinct("proyectoId", {
      colaborador: colaborador._id,
    });
    const filtro = {
      estado: PROYECTO_ESTADO.ABIERTO,
      _id: { $nin: yaSePostulo },
      perfiles: {
        $elemMatch: {
          busquedaAbierta: { $ne: false },
          cupoCompleto: { $ne: true },
          $or: [{ fechaCierreBusqueda: null }, { fechaCierreBusqueda: { $gt: ahora } }],
          "habilidadesRequeridas.0": { $exists: true },
          habilidadesRequeridas: { $not: { $elemMatch: { codigo: { $nin: codigos } } } },
        },
      },
    };
    return this.paginar(filtro, numeroPagina, limitePorPagina);
  }

  async paginar(filtro, numeroPagina, limitePorPagina) {
    const [items, total] = await Promise.all([
      ProyectoModel.find(filtro)
        .sort(ORDEN)
        .skip(salto(numeroPagina, limitePorPagina))
        .limit(limitePorPagina),
      ProyectoModel.countDocuments(filtro),
    ]);
    return { items: await this.conColaboraciones(items), total };
  }

  async conColaboraciones(proyectos) {
    if (proyectos.length === 0) return proyectos;
    const colaboraciones = await ColaboracionModel.find({
      proyectoId: { $in: proyectos.map((p) => p._id) },
    })
      .sort({ fecha: 1, _id: 1 })
      .populate("colaborador");
    for (const proyecto of proyectos) {
      proyecto.colaboraciones = colaboraciones.filter(
        (c) => String(c.proyectoId) === String(proyecto._id),
      );
    }
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
