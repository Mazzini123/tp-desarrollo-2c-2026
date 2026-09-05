import { DomainError } from "../errors/index.js";
import { esPeriodoCompromisoValido } from "./enums/PeriodoCompromiso.js";

/** Compromiso de horas esperado para un Proyecto. */
export class Compromiso {
  constructor({ cantidadHoras, periodo }) {
    if (!Number.isInteger(cantidadHoras) || cantidadHoras <= 0) {
      throw new DomainError("cantidadHoras debe ser un entero positivo");
    }
    if (!esPeriodoCompromisoValido(periodo)) {
      throw new DomainError(`Período de compromiso inválido: ${periodo}`);
    }

    this.cantidadHoras = cantidadHoras;
    this.periodo = periodo;
  }
}
