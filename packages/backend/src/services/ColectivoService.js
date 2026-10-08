import { Colectivo } from "../domain/Colectivo.js";
import { Ubicacion, PROVINCIAS } from "../domain/Ubicacion.js";
import { DomainError } from "../errors/DomainError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { esTipoColectivoValido } from "../domain/enums/TIPO_COLECTIVO.js";
import { TIPO_UBICACION, esTipoUbicacionValido } from "../domain/enums/TIPO_UBICACION.js";
import { tieneContenido } from "../utils/validaciones.js";
import { armarPaginado } from "../utils/paginacion.js";
import { construirRedesSociales } from "../domain/RedSocial.js";
import { normalizarEtiquetas } from "../domain/etiquetas.js";
import { MedioDeContacto } from "../domain/MedioDeContacto.js";
import { ConflictError } from "../errors/ConflictError.js";
import { cerrarProyecto, notificarResoluciones } from "./reglasDePostulacion.js";
import { TIPO_EVENTO_TIMELINE } from "../domain/enums/TIPO_EVENTO_TIMELINE.js";

export class ColectivoService {
  constructor({ colectivoRepository, notificacionService }) {
    this.colectivoRepository = colectivoRepository;
    this.notificacionService = notificacionService;
  }

  async crear({
    nombre,
    descripcion,
    tipoColectivo,
    ubicacion,
    redesSociales = [],
    etiquetas = [],
    mediosDeContacto = [],
  }) {
    this.validarNombre(nombre);
    this.validarDescripcion(descripcion);
    this.validarTipoColectivo(tipoColectivo);

    const colectivo = new Colectivo({
      nombre,
      descripcion,
      tipoColectivo,
      ubicacion: this.construirUbicacion(ubicacion),
    });
    colectivo.redesSociales = construirRedesSociales(redesSociales);
    colectivo.etiquetas = normalizarEtiquetas(etiquetas);
    colectivo.mediosDeContacto = this.construirMediosDeContacto(mediosDeContacto);

    return this.colectivoRepository.guardar(colectivo);
  }

  async listar({ numeroPagina = 1, limitePorPagina = 10, etiqueta } = {}) {
    return armarPaginado(
      await this.colectivoRepository.listarPaginado(numeroPagina, limitePorPagina, { etiqueta }),
      numeroPagina,
      limitePorPagina,
    );
  }

  async buscarPorId(id) {
    const colectivo = await this.colectivoRepository.buscarPorId(id);
    if (!colectivo) {
      throw new NotFoundError(`No existe un colectivo con id "${id}"`);
    }
    return colectivo;
  }

  async actualizar(id, { nombre, descripcion, ubicacion, redesSociales, etiquetas, mediosDeContacto }) {
    const colectivo = await this.buscarPorId(id);

    if (colectivo.estaDadoDeBaja()) {
      throw new ConflictError("No se puede modificar un colectivo dado de baja");
    }

    if (nombre !== undefined) {
      this.validarNombre(nombre);
      colectivo.nombre = nombre;
    }

    if (descripcion !== undefined) {
      this.validarDescripcion(descripcion);
      colectivo.descripcion = descripcion;
    }

    if (ubicacion !== undefined) {
      colectivo.ubicacion = this.construirUbicacion(ubicacion);
    }

    if (redesSociales !== undefined) {
      colectivo.redesSociales = construirRedesSociales(redesSociales);
    }

    if (etiquetas !== undefined) {
      colectivo.etiquetas = normalizarEtiquetas(etiquetas);
    }

    if (mediosDeContacto !== undefined) {
      colectivo.mediosDeContacto = this.construirMediosDeContacto(mediosDeContacto);
    }

    return this.colectivoRepository.guardar(colectivo);
  }

  // Requerimiento adicional 23: el colectivo elimina su cuenta. Sus proyectos
  // abiertos se cierran con las mismas consecuencias que un cierre manual
  // (se rechazan las postulaciones pendientes y terminan las colaboraciones
  // en curso), porque una organizacion que se fue no puede seguir sumando
  // gente. Lo historico queda: proyectos, logros, colaboraciones.
  async darDeBaja(id, ahora = new Date()) {
    const colectivo = await this.buscarPorId(id);

    if (colectivo.estaDadoDeBaja()) {
      throw new ConflictError("El colectivo ya esta dado de baja");
    }

    const cierres = colectivo.proyectos
      .filter((proyecto) => proyecto.estaAbierto())
      .map((proyecto) => [proyecto, cerrarProyecto(proyecto, ahora)]);

    colectivo.darDeBaja(ahora);
    await this.colectivoRepository.guardar(colectivo);

    for (const [proyecto, cambios] of cierres) {
      await notificarResoluciones(this.notificacionService, proyecto, cambios);
    }

    return colectivo;
  }

  // Requerimiento adicional 19: "Vista cronologica que muestre todos los
  // proyectos creados por un colectivo, logros cargados y colaboraciones
  // cerradas de una organizacion, a modo de historial publico".
  //
  // Ademas de lo que pide, se suman los avances (porcentaje de concrecion):
  // son el historial de "trazabilidad" que pide la entrega 2 para los logros.
  //
  // No se guarda en ningun lado: se arma recorriendo el agregado, porque toda
  // la informacion ya esta adentro del documento del colectivo.
  async timeline(id) {
    const colectivo = await this.buscarPorId(id);
    const eventos = [
      evento(TIPO_EVENTO_TIMELINE.ALTA_DEL_COLECTIVO, colectivo.fechaAlta),
      evento(TIPO_EVENTO_TIMELINE.BAJA_DEL_COLECTIVO, colectivo.fechaBaja),
    ];

    colectivo.proyectos.forEach((proyecto) => {
      const delProyecto = { proyecto: { id: proyecto.id, titulo: proyecto.titulo } };

      eventos.push(
        evento(TIPO_EVENTO_TIMELINE.PROYECTO_CREADO, proyecto.fechaCreacion, delProyecto),
        evento(TIPO_EVENTO_TIMELINE.PROYECTO_FINALIZADO, proyecto.fechaFinalizacion, delProyecto),
        ...proyecto.logros.map((logro) =>
          evento(TIPO_EVENTO_TIMELINE.LOGRO, logro.fecha, {
            ...delProyecto,
            logro: { titulo: logro.titulo, descripcion: logro.descripcion },
          }),
        ),
        ...proyecto.avances.map((avance) =>
          evento(TIPO_EVENTO_TIMELINE.AVANCE, avance.fecha, {
            ...delProyecto,
            avance: {
              porcentajeConcrecion: avance.porcentajeConcrecion,
              urlSistema: avance.urlSistema,
              urlRepositorio: avance.urlRepositorio,
            },
          }),
        ),
        ...proyecto.colaboraciones
          .filter((c) => c.estaFinalizada())
          .map((c) =>
            evento(TIPO_EVENTO_TIMELINE.COLABORACION_CERRADA, c.fechaFin, {
              ...delProyecto,
              // Una contribucion anonima figura, pero sin decir de quien.
              colaborador: c.esPublica
                ? { id: c.colaborador.id, nombre: c.colaborador.nombreParaMostrar() }
                : null,
            }),
          ),
      );
    });

    return (
      eventos
        // Lo guardado antes de esta entrega puede no tener fecha: no se inventa.
        .filter((e) => e.fecha)
        // Cronologica: de lo mas viejo a lo mas nuevo.
        .sort((a, b) => a.fecha - b.fecha)
    );
  }

  construirMediosDeContacto(lista) {
    return lista
      .map((datos) => new MedioDeContacto(datos))
      .filter((medio, i, todos) => todos.findIndex((otro) => otro.equals(medio)) === i);
  }

  construirUbicacion(datos) {
    if (!datos) return null;

    const { tipoUbicacion, nombre } = datos;

    if (!esTipoUbicacionValido(tipoUbicacion)) {
      throw new DomainError(`Tipo de ubicación inválido: ${tipoUbicacion}`);
    }
    if (tipoUbicacion === TIPO_UBICACION.PROVINCIA && !PROVINCIAS.includes(nombre)) {
      throw new DomainError(
        `Para PROVINCIA, nombre debe ser una de las 23 provincias argentinas. Recibido: ${nombre}`,
      );
    }
    if (tipoUbicacion === TIPO_UBICACION.LOCALIDAD && !tieneContenido(nombre)) {
      throw new DomainError("Para LOCALIDAD, nombre es obligatorio");
    }

    return new Ubicacion(datos);
  }

  validarNombre(nombre) {
    if (!tieneContenido(nombre)) {
      throw new DomainError("El nombre del colectivo es obligatorio");
    }
  }

  validarDescripcion(descripcion) {
    if (!tieneContenido(descripcion)) {
      throw new DomainError("La descripción del colectivo es obligatoria");
    }
  }

  validarTipoColectivo(tipoColectivo) {
    if (!esTipoColectivoValido(tipoColectivo)) {
      throw new DomainError(`Tipo de colectivo inválido: ${tipoColectivo}`);
    }
  }
}

function evento(tipo, fecha, datos = {}) {
  return { tipo, fecha, ...datos };
}
