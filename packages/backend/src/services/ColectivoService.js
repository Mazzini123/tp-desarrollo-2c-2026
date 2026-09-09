import { Colectivo } from "../domain/Colectivo.js";
import { Ubicacion, PROVINCIAS } from "../domain/Ubicacion.js";
import { DomainError } from "../errors/DomainError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { esTipoColectivoValido } from "../domain/enums/TIPO_COLECTIVO.js";
import { TIPO_UBICACION, esTipoUbicacionValido } from "../domain/enums/TIPO_UBICACION.js";
import { tieneContenido } from "../utils/validaciones.js";
import { armarPaginado } from "../utils/paginacion.js";

export class ColectivoService {
  constructor({ colectivoRepository }) {
    this.colectivoRepository = colectivoRepository;
  }

  crear({ nombre, descripcion, tipoColectivo, ubicacion }) {
    this.validarNombre(nombre);
    this.validarDescripcion(descripcion);
    this.validarTipoColectivo(tipoColectivo);

    const colectivo = new Colectivo({
      nombre,
      descripcion,
      tipoColectivo,
      ubicacion: this.construirUbicacion(ubicacion),
    });

    return this.colectivoRepository.guardar(colectivo);
  }

  listar({ numeroPagina = 1, limitePorPagina = 10 } = {}) {
    return armarPaginado(
      this.colectivoRepository.listarPaginado(numeroPagina, limitePorPagina),
      numeroPagina,
      limitePorPagina,
    );
  }

  buscarPorId(id) {
    const colectivo = this.colectivoRepository.buscarPorId(id);
    if (!colectivo) {
      throw new NotFoundError(`No existe un colectivo con id "${id}"`);
    }
    return colectivo;
  }

  actualizar(id, { nombre, descripcion, ubicacion }) {
    const colectivo = this.buscarPorId(id);

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

    return this.colectivoRepository.guardar(colectivo);
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
