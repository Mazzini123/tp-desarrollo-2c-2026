import { randomUUID } from "node:crypto";
import { DomainError } from "./DomainError.js";

/**
 * Entidad. Vínculo entre una PersonaColaboradora y un Proyecto: se
 * crea cuando la persona "se anota" en el proyecto.
 *
 * Es un agregado independiente (no una lista dentro de Proyecto ni
 * de PersonaColaboradora), referenciando a ambos por id. Se modela
 * como entidad propia -no como una simple relación- porque en la
 * Segunda Entrega sumará el dato de contribución anónima, y en la
 * Tercera pasará a originarse en una Postulación aceptada y podrá
 * ser desanotada. Mantenerla como clase desde ahora evita rehacer
 * esta relación luego.
 *
 * La validación de que el proyecto esté abierto, de que la persona
 * cumpla alguna habilidad requerida, y de que no exista ya una
 * colaboración entre ese proyecto y esa persona, es responsabilidad
 * de ColaboracionService (necesita consultar repositorios, no es
 * algo que la entidad pueda saber por sí sola).
 */
export class Colaboracion {
  #id;
  #proyectoId;
  #personaColaboradoraId;
  #fechaDeInicio;

  constructor({ id = randomUUID(), proyectoId, personaColaboradoraId, fechaDeInicio = new Date() }) {
    if (!proyectoId) {
      throw new DomainError("La colaboración debe referenciar un proyecto (proyectoId)");
    }
    if (!personaColaboradoraId) {
      throw new DomainError(
        "La colaboración debe referenciar una persona colaboradora (personaColaboradoraId)",
      );
    }
    if (!(fechaDeInicio instanceof Date) || Number.isNaN(fechaDeInicio.getTime())) {
      throw new DomainError("fechaDeInicio debe ser una fecha válida");
    }

    this.#id = id;
    this.#proyectoId = proyectoId;
    this.#personaColaboradoraId = personaColaboradoraId;
    this.#fechaDeInicio = fechaDeInicio;
  }

  get id() {
    return this.#id;
  }

  get proyectoId() {
    return this.#proyectoId;
  }

  get personaColaboradoraId() {
    return this.#personaColaboradoraId;
  }

  get fechaDeInicio() {
    return this.#fechaDeInicio;
  }

  toJSON() {
    return {
      id: this.#id,
      proyectoId: this.#proyectoId,
      personaColaboradoraId: this.#personaColaboradoraId,
      fechaDeInicio: this.#fechaDeInicio.toISOString(),
    };
  }
}
