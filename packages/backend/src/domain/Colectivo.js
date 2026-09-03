import { randomUUID } from "node:crypto";
import { DomainError } from "./DomainError.js";
import { esTipoDeColectivoValido } from "./enums/TipoDeColectivo.js";
import { Ubicacion } from "./valueObjects/Ubicacion.js";

/**
 * Entidad. Organización que lleva adelante una determinada causa
 * (fundación, ONG, asamblea, asociación barrial) y publica Proyectos
 * para que personas colaboradoras se sumen.
 *
 * No conoce a sus Proyectos: la relación se expresa al revés,
 * Proyecto referencia al Colectivo al que pertenece (ver Proyecto.js).
 * El alta, la modificación y cualquier operación que involucre a
 * varias entidades vive en ColectivoService / ProyectoService, no acá.
 */
export class Colectivo {
  #id;
  #nombre;
  #descripcion;
  #tipo;
  #ubicacion;

  constructor({ id = randomUUID(), nombre, descripcion, tipo, ubicacion = null }) {
    if (!nombre || nombre.trim().length === 0) {
      throw new DomainError("El nombre del colectivo es obligatorio");
    }
    if (!descripcion || descripcion.trim().length === 0) {
      throw new DomainError("La descripción del colectivo es obligatoria");
    }
    if (!esTipoDeColectivoValido(tipo)) {
      throw new DomainError(`Tipo de colectivo inválido: ${tipo}`);
    }
    if (ubicacion !== null && !(ubicacion instanceof Ubicacion)) {
      throw new DomainError("ubicacion debe ser una instancia de Ubicacion");
    }

    this.#id = id;
    this.#nombre = nombre.trim();
    this.#descripcion = descripcion.trim();
    this.#tipo = tipo;
    this.#ubicacion = ubicacion;
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

  get tipo() {
    return this.#tipo;
  }

  get ubicacion() {
    return this.#ubicacion;
  }

  /**
   * Modificación de datos editables. No permite cambiar el tipo:
   * de necesitarse, es una decisión de negocio que puede requerir
   * revisión administrativa y por eso queda fuera de esta operación
   * estructural simple.
   */
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
      tipo: this.#tipo,
      ubicacion: this.#ubicacion ? this.#ubicacion.toJSON() : null,
    };
  }
}
