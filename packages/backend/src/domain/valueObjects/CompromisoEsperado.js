import { DomainError } from "../DomainError.js";
import {
  UnidadDeCompromiso,
  esUnidadDeCompromisoValida,
} from "../enums/UnidadDeCompromiso.js";

/**
 * Value Object. Compromiso de horas esperado para un Proyecto.
 *
 * Queda independiente de Proyecto a propósito: en la Segunda Entrega
 * pasará a formar parte de Perfil sin que cambie su estructura interna.
 */
export class CompromisoEsperado {
  #unidad;
  #cantidadHoras;

  constructor({ unidad, cantidadHoras }) {
    if (!esUnidadDeCompromisoValida(unidad)) {
      throw new DomainError(`Unidad de compromiso inválida: ${unidad}`);
    }
    if (!Number.isInteger(cantidadHoras) || cantidadHoras <= 0) {
      throw new DomainError("cantidadHoras debe ser un entero positivo");
    }

    this.#unidad = unidad;
    this.#cantidadHoras = cantidadHoras;
  }

  get unidad() {
    return this.#unidad;
  }

  get cantidadHoras() {
    return this.#cantidadHoras;
  }

  toJSON() {
    return { unidad: this.#unidad, cantidadHoras: this.#cantidadHoras };
  }
}

export { UnidadDeCompromiso };
