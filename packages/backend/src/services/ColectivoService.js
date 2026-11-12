import { notificarResoluciones } from "./soporte/notificarResoluciones.js";
import { buscarProvincia, nombreDeUbicacion } from "../domain/Ubicacion.js";
import { DomainError } from "../errors/DomainError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { TIPO_UBICACION } from "../domain/enums/TIPO_UBICACION.js";
import { armarPaginado } from "../utils/paginacion.js";
import { construirRedesSociales } from "../domain/RedSocial.js";
import { normalizarEtiquetas } from "../domain/etiquetas.js";
import { sinMediosRepetidos } from "../domain/MedioDeContacto.js";
import { ConflictError } from "../errors/ConflictError.js";
import { cerrarProyecto } from "./reglasDePostulacion.js";
import { paginaDeResumenes } from "../dto/resumenDeProyecto.js";
import { PRIMERA_PAGINA, metaDePrimeraPagina } from "../dto/paginacion.js";

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
    const pagina = { numeroPagina, limitePorPagina };
    return armarPaginado(
      await this.colectivoRepository.listarPaginado(pagina, { etiqueta }),
      pagina,
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

    if (colectivo.tieneMedioDeContacto(nuevo)) {
      throw new ConflictError("El colectivo ya tiene registrado ese medio de contacto");
    }

    colectivo.agregarMedioDeContacto(nuevo);
    await this.colectivoRepository.guardar(colectivo);
    return nuevo;
  }

  async quitarMedioDeContacto(id, medio) {
    const colectivo = await this.buscarPorId(id);
    if (!colectivo.tieneMedioDeContacto(medio)) {
      throw new NotFoundError("El colectivo no tiene registrado ese medio de contacto");
    }

    colectivo.quitarMedioDeContacto(medio);
    await this.colectivoRepository.guardar(colectivo);
  }

  async actualizar(id, { nombre, descripcion, ubicacion, redesSociales, etiquetas }) {
    return this.transacciones.ejecutar(async () => {
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

      await this.colectivoRepository.guardar(colectivo);
      if (nombre !== undefined || ubicacion !== undefined) {
        await this.proyectoRepository.actualizarDatosDelColectivo(colectivo);
      }
      return colectivo;
    });
  }

  async darDeBaja(id, ahora = new Date()) {
    return this.transacciones.ejecutar(async () => {
      const colectivo = await this.buscarPorId(id, { bloquear: true });

      if (colectivo.estaDadoDeBaja()) {
        throw new ConflictError("El colectivo ya esta dado de baja");
      }

      colectivo.darDeBaja(ahora);
      colectivo.mediosDeContacto = [];
      colectivo.redesSociales = [];
      await this.colectivoRepository.guardar(colectivo);

      const abiertos = (await this.proyectoRepository.buscarPorColectivo(id)).filter(
        (proyecto) => proyecto.estaAbierto(),
      );
      for (const proyecto of abiertos) {
        const cambios = cerrarProyecto(proyecto, ahora);
        await this.proyectoRepository.guardar(proyecto);
        await notificarResoluciones(this.notificacionService, proyecto, cambios);
      }

      return colectivo;
    });
  }

  async conCantidadDeProyectos(colectivos) {
    const cantidades = await this.proyectoRepository.contarPorColectivos(
      colectivos.map((c) => c._id),
    );
    return colectivos.map((c) => ({
      ...c.toJSON(),
      cantidadProyectos: cantidades.get(c.id) ?? 0,
    }));
  }

  async conPrimerosProyectos(colectivo) {
    const pagina = paginaDeResumenes(
      await this.proyectoRepository.listarPorColectivoPaginado(
        colectivo._id,
        PRIMERA_PAGINA,
      ),
    );
    return {
      ...colectivo.toJSON(),
      proyectos: pagina.items.map(({ colectivo: _colectivo, ...proyecto }) => proyecto),
      proyectosMeta: metaDePrimeraPagina(pagina.total),
    };
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
