import { randomUUID } from "node:crypto";
import { DomainError } from "../errors/index.js";
import { Colaborador } from "./Colaborador.js";

/**
 * Vínculo entre un Colaborador y un Proyecto: se crea cuando el
 * colaborador "se anota".
 *
 * Vive dentro del Proyecto, por eso no guarda referencia al proyecto:
 * se llega a la colaboración navegando desde él. Sí guarda al
 * Colaborador completo, no su id.
 */
export class Colaboracion {
  constructor({ id = randomUUID(), colaborador, fecha = new Date() }) {
    if (!(colaborador instanceof Colaborador)) {
      throw new DomainError("La colaboración debe referenciar un Colaborador");
    }

    this.id = id;
    this.colaborador = colaborador;
    this.fecha = fecha;
  }
}
