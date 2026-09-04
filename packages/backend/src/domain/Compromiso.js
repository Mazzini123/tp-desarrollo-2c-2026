import { DomainError } from "./DomainError.js";
import { esPeriodoCompromisoValido } from "./enums/PeriodoCompromiso.js";

/**
 * Compromiso de horas esperado para un Proyecto: una cantidad de
 * horas y el período al que corresponde.
 */
export class Compromiso {
  #cantidadHoras;
  #periodo;

  constructor({ cantidadHoras, periodo }) {
    if (!Number.isInteger(cantidadHoras) || cantidadHoras <= 0) {
      throw new DomainError("cantidadHoras debe ser un entero positivo");
    }
    if (!esPeriodoCompromisoValido(periodo)) {
      throw new DomainError(`Período de compromiso inválido: ${periodo}`);
    }

    this.#cantidadHoras = cantidadHoras;
    this.#periodo = periodo;
  }

  get cantidadHoras() {
    return this.#cantidadHoras;
  }

  get periodo() {
    return this.#periodo;
  }

  toJSON() {
    return { cantidadHoras: this.#cantidadHoras, periodo: this.#periodo };
  }
}
