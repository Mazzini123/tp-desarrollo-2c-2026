import { randomUUID } from "node:crypto";
import { DomainError } from "./DomainError.js";
import { Colaborador } from "./Colaborador.js";

/**
 * Vínculo entre un Colaborador y un Proyecto: se crea cuando el
 * colaborador "se anota" en el proyecto.
 *
 * Vive dentro del Proyecto (Proyecto tiene una lista de
 * Colaboraciones), por eso no guarda una referencia al proyecto: se
 * llega a la colaboración navegando desde él. Sí guarda al
 * Colaborador completo, no su id.
 */
export class Colaboracion {
  #id;
  #fecha;
  #colaborador;

  constructor({ id = randomUUID(), colaborador, fecha = new Date() }) {
    if (!(colaborador instanceof Colaborador)) {
      throw new DomainError("La colaboración debe referenciar un Colaborador");
    }
    if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
      throw new DomainError("fecha debe ser una fecha válida");
    }

    this.#id = id;
    this.#colaborador = colaborador;
    this.#fecha = fecha;
  }

  get id() {
    return this.#id;
  }

  get fecha() {
    return this.#fecha;
  }

  get colaborador() {
    return this.#colaborador;
  }

  toJSON() {
    return {
      id: this.#id,
      fecha: this.#fecha.toISOString(),
      colaborador: this.#colaborador.toJSON(),
    };
  }
}
