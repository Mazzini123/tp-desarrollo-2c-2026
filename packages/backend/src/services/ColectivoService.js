import { buscarProvincia, nombreDeUbicacion } from "../domain/Ubicacion.js";
import { DomainError } from "../errors/DomainError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { TIPO_UBICACION } from "../domain/enums/TIPO_UBICACION.js";
import { armarPaginado } from "../utils/paginacion.js";
import { construirRedesSociales } from "../domain/RedSocial.js";
import { normalizarEtiquetas } from "../domain/etiquetas.js";
import { mismoMedioDeContacto, sinMediosRepetidos } from "../domain/MedioDeContacto.js";
import { ConflictError } from "../errors/ConflictError.js";
import { cerrarProyecto, notificarResoluciones } from "./reglasDePostulacion.js";
import { TIPO_EVENTO_TIMELINE } from "../domain/enums/TIPO_EVENTO_TIMELINE.js";

export class ColectivoService {
  constructor({
    colectivoRepository,
    proyectoRepository,
    notificacionService,
    transacciones,
  }) {
    this.transacciones = transacciones;
    this.colectivoRepository = colectivoRepository;
    this.proyectoRepository = proyectoRepository;
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
    return this.colectivoRepository.crear({
      nombre,
      descripcion,
      tipoColectivo,
      ubicacion: this.construirUbicacion(ubicacion),
      redesSociales: construirRedesSociales(redesSociales),
      etiquetas: normalizarEtiquetas(etiquetas),
      mediosDeContacto: sinMediosRepetidos(mediosDeContacto),
    });
  }

  async listar({ numeroPagina = 1, limitePorPagina = 10, etiqueta } = {}) {
    return armarPaginado(
      await this.colectivoRepository.listarPaginado(numeroPagina, limitePorPagina, {
        etiqueta,
      }),
      numeroPagina,
      limitePorPagina,
    );
  }

  async buscarPorId(id, { bloquear = false } = {}) {
    const colectivo = bloquear
      ? await this.colectivoRepository.bloquear(id)
      : await this.colectivoRepository.buscarPorId(id);
    if (!colectivo) {
      throw new NotFoundError(`No existe un colectivo con id "${id}"`);
    }
    return colectivo;
  }

  async mediosDeContacto(id) {
    const colectivo = await this.buscarPorId(id);
    return colectivo.mediosDeContacto.map(({ tipo, valor }) => ({ tipo, valor }));
  }

  async agregarMedioDeContacto(id, medio) {
    const colectivo = await this.buscarPorId(id);
    const [nuevo] = sinMediosRepetidos([medio]);

    if (
      colectivo.mediosDeContacto.some((existente) =>
        mismoMedioDeContacto(existente, nuevo),
      )
    ) {
      throw new ConflictError("El colectivo ya tiene registrado ese medio de contacto");
    }

    colectivo.mediosDeContacto.push(nuevo);
    await this.colectivoRepository.guardar(colectivo);
    return nuevo;
  }

  async quitarMedioDeContacto(id, medio) {
    const colectivo = await this.buscarPorId(id);
    const restantes = colectivo.mediosDeContacto.filter(
      (existente) => !mismoMedioDeContacto(existente, medio),
    );

    if (restantes.length === colectivo.mediosDeContacto.length) {
      throw new NotFoundError("El colectivo no tiene registrado ese medio de contacto");
    }

    colectivo.mediosDeContacto = restantes;
    await this.colectivoRepository.guardar(colectivo);
  }

  async actualizar(
    id,
    { nombre, descripcion, ubicacion, redesSociales, etiquetas, mediosDeContacto },
  ) {
    const colectivo = await this.buscarPorId(id);

    if (colectivo.estaDadoDeBaja()) {
      throw new ConflictError("No se puede modificar un colectivo dado de baja");
    }

    if (nombre !== undefined) {
      colectivo.nombre = nombre;
    }

    if (descripcion !== undefined) {
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
      colectivo.mediosDeContacto = sinMediosRepetidos(mediosDeContacto);
    }

    await this.colectivoRepository.guardar(colectivo);
    if (nombre !== undefined || ubicacion !== undefined) {
      await this.proyectoRepository.actualizarDatosDelColectivo(colectivo);
    }
    return colectivo;
  }

  async darDeBaja(id, ahora = new Date()) {
    return this.transacciones.ejecutar(async () => {
      const colectivo = await this.buscarPorId(id, { bloquear: true });

      if (colectivo.estaDadoDeBaja()) {
        throw new ConflictError("El colectivo ya esta dado de baja");
      }

      colectivo.darDeBaja(ahora);
      // Al dar de baja se borran los datos de contacto: dejan de ser publicos.
      colectivo.mediosDeContacto = [];
      colectivo.redesSociales = [];
      await this.colectivoRepository.guardar(colectivo);

      const abiertos = (await this.proyectoRepository.buscarPorColectivo(id)).filter(
        (proyecto) => proyecto.estaAbierto(),
      );
      for (const proyecto of abiertos) {
        const cambios = cerrarProyecto(proyecto, ahora);
        await this.proyectoRepository.guardar(proyecto);
        // La notificación se encola en Mongo. El job la ve después del commit.
        await notificarResoluciones(this.notificacionService, proyecto, cambios, {
          propagarError: true,
        });
      }

      return colectivo;
    });
  }

  async timeline(id) {
    const colectivo = await this.buscarPorId(id);
    const proyectos = await this.proyectoRepository.buscarPorColectivo(id);
    const eventos = [
      evento(TIPO_EVENTO_TIMELINE.ALTA_DEL_COLECTIVO, colectivo.fechaAlta),
      evento(TIPO_EVENTO_TIMELINE.BAJA_DEL_COLECTIVO, colectivo.fechaBaja),
    ];

    proyectos.forEach((proyecto) => {
      const delProyecto = { proyecto: { id: proyecto.id, titulo: proyecto.titulo } };

      eventos.push(
        evento(TIPO_EVENTO_TIMELINE.PROYECTO_CREADO, proyecto.fechaCreacion, delProyecto),
        evento(
          TIPO_EVENTO_TIMELINE.PROYECTO_FINALIZADO,
          proyecto.fechaFinalizacion,
          delProyecto,
        ),
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
              colaborador: c.esPublica
                ? { id: c.colaborador.id, nombre: c.colaborador.nombreParaMostrar() }
                : null,
            }),
          ),
      );
    });

    return eventos.filter((e) => e.fecha).sort((a, b) => a.fecha - b.fecha);
  }

  async conProyectos(colectivos) {
    const lista = Array.isArray(colectivos) ? colectivos : [colectivos];
    const proyectos = await this.proyectoRepository.buscarPorColectivos(
      lista.map((c) => c._id),
    );
    const vistas = lista.map((colectivo) => ({
      ...colectivo.toJSON(),
      proyectos: proyectos
        .filter((p) => String(p.colectivoId) === String(colectivo._id))
        .map((p) => {
          const { colectivo: _, ...json } = p.toJSON();
          return json;
        }),
    }));
    return Array.isArray(colectivos) ? vistas : vistas[0];
  }

  construirUbicacion(datos) {
    if (!datos) return null;

    const { tipoUbicacion, nombre } = datos;

    const provincia =
      tipoUbicacion === TIPO_UBICACION.PROVINCIA ? buscarProvincia(nombre) : null;
    if (tipoUbicacion === TIPO_UBICACION.PROVINCIA && !provincia) {
      throw new DomainError(
        `Para PROVINCIA, nombre debe ser una de las 23 provincias argentinas. Recibido: ${nombre}`,
      );
    }
    if (tipoUbicacion === TIPO_UBICACION.LOCALIDAD && !nombre) {
      throw new DomainError("Para LOCALIDAD, nombre es obligatorio");
    }

    return {
      tipoUbicacion,
      nombre: nombreDeUbicacion(tipoUbicacion, provincia ?? nombre),
    };
  }
}

function evento(tipo, fecha, datos = {}) {
  return { tipo, fecha, ...datos };
}
