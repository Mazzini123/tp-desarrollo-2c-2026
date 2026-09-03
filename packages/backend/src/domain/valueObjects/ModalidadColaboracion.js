import { DomainError } from "../DomainError.js";

/**
 * Value Object. Modalidad de colaboración que ofrece un Proyecto:
 * si es únicamente gratuita, si ofrece incentivo económico y/o si
 * existe posibilidad de contratación eventual.
 *
 * Junto con CompromisoEsperado, queda independiente de Proyecto:
 * en la Segunda Entrega pasará a formar parte de Perfil.
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

  esUnicamenteGratuita() {
    return !this.#ofreceIncentivoEconomico && !this.#posibilidadDeContratacion;
  }

  toJSON() {
    return {
      ofreceIncentivoEconomico: this.#ofreceIncentivoEconomico,
      posibilidadDeContratacion: this.#posibilidadDeContratacion,
    };
  }
}
