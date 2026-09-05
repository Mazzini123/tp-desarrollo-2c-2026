import { randomUUID } from "node:crypto";
import { DomainError } from "./DomainError.js";
import { esTipoColectivoValido } from "./enums/TipoColectivo.js";
import { Ubicacion } from "./Ubicacion.js";
import { Proyecto } from "./Proyecto.js";

/**
 * Organización que lleva adelante una causa y publica Proyectos.
 *
 * Es la raíz del agregado: contiene sus Proyectos, que a su vez
 * contienen sus Colaboraciones. Por eso el único repositorio que
 * existe para esta rama del modelo es ColectivoRepository: a un
 * proyecto se llega navegando desde su colectivo.
 */
export class Colectivo {
  #id;
  #nombre;
  #descripcion;
  #tipoColectivo;
  #ubicacion;
  #proyectos;

  constructor({ id = randomUUID(), nombre, descripcion, tipoColectivo, ubicacion = null }) {
    if (!nombre || nombre.trim().length === 0) {
      throw new DomainError("El nombre del colectivo es obligatorio");
    }
    if (!descripcion || descripcion.trim().length === 0) {
      throw new DomainError("La descripción del colectivo es obligatoria");
    }
    if (!esTipoColectivoValido(tipoColectivo)) {
      throw new DomainError(`Tipo de colectivo inválido: ${tipoColectivo}`);
    }
    if (ubicacion !== null && !(ubicacion instanceof Ubicacion)) {
      throw new DomainError("ubicacion debe ser una instancia de Ubicacion");
    }

    this.#id = id;
    this.#nombre = nombre.trim();
    this.#descripcion = descripcion.trim();
    this.#tipoColectivo = tipoColectivo;
    this.#ubicacion = ubicacion;
    this.#proyectos = [];
  }

  get id() {
    return this.#id;
  }

  get nombre() {
    return this.#nombre;
  }

  get descripcion() {
    return this.#descripcion;
  }

  get tipoColectivo() {
    return this.#tipoColectivo;
  }

  get ubicacion() {
    return this.#ubicacion;
  }

  get proyectos() {
    return [...this.#proyectos];
  }

  agregarProyecto(proyecto) {
    if (!(proyecto instanceof Proyecto)) {
      throw new DomainError("Se esperaba una instancia de Proyecto");
    }
    this.#proyectos.push(proyecto);
  }

  buscarProyecto(proyectoId) {
    return this.#proyectos.find((p) => p.id === proyectoId) ?? null;
  }

  actualizarDatos({ nombre, descripcion, ubicacion }) {
    if (nombre !== undefined) {
      if (!nombre || nombre.trim().length === 0) {
        throw new DomainError("El nombre del colectivo es obligatorio");
      }
      this.#nombre = nombre.trim();
    }
    if (descripcion !== undefined) {
      if (!descripcion || descripcion.trim().length === 0) {
        throw new DomainError("La descripción del colectivo es obligatoria");
      }
      this.#descripcion = descripcion.trim();
    }
    if (ubicacion !== undefined) {
      if (ubicacion !== null && !(ubicacion instanceof Ubicacion)) {
        throw new DomainError("ubicacion debe ser una instancia de Ubicacion");
      }
      this.#ubicacion = ubicacion;
    }
  }

  toJSON() {
    return {
      id: this.#id,
      nombre: this.#nombre,
      descripcion: this.#descripcion,
      tipoColectivo: this.#tipoColectivo,
      ubicacion: this.#ubicacion ? this.#ubicacion.toJSON() : null,
      proyectos: this.#proyectos.map((p) => p.toJSON()),
    };
  }
}
