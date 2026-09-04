import { DomainError } from "./DomainError.js";

/**
 * Modalidad de colaboración de un Proyecto: si ofrece incentivo
 * económico y/o si existe posibilidad de contratación eventual.
 * Si no ofrece ninguna de las dos, la colaboración es gratuita.
 */
export class ModalidadColaboracion {
  #ofreceIncentivoEconomico;
  #posibilidadDeContratacion;

  constructor({ ofreceIncentivoEconomico = false, posibilidadDeContratacion = false } = {}) {
    if (typeof ofreceIncentivoEconomico !== "boolean") {
      throw new DomainError("ofreceIncentivoEconomico debe ser boolean");
    }
    if (typeof posibilidadDeContratacion !== "boolean") {
      throw new DomainError("posibilidadDeContratacion debe ser boolean");
    }

    this.#ofreceIncentivoEconomico = ofreceIncentivoEconomico;
    this.#posibilidadDeContratacion = posibilidadDeContratacion;
  }

  get ofreceIncentivoEconomico() {
    return this.#ofreceIncentivoEconomico;
  }

  get posibilidadDeContratacion() {
    return this.#posibilidadDeContratacion;
  }

  esGratuito() {
    return !this.#ofreceIncentivoEconomico && !this.#posibilidadDeContratacion;
  }

  toJSON() {
    return {
      ofreceIncentivoEconomico: this.#ofreceIncentivoEconomico,
      posibilidadDeContratacion: this.#posibilidadDeContratacion,
    };
  }
}
