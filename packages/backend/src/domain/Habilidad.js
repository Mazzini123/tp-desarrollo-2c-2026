import { DomainError } from "./DomainError.js";

function normalizarATituloSnakeCase(titulo) {
  return titulo
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // saca acentos
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Entidad. Definida por un título, un código único y una descripción.
 * Las habilidades son precargadas por el equipo administrativo de
 * la plataforma (no las crean colectivos ni personas colaboradoras).
 *
 * El código, por ahora, es el título normalizado en snake_case.
 */
export class Habilidad {
  #codigo;
  #titulo;
  #descripcion;

  constructor({ codigo, titulo, descripcion }) {
    if (!titulo || titulo.trim().length === 0) {
      throw new DomainError("El título de la habilidad es obligatorio");
    }
    if (!codigo || codigo.trim().length === 0) {
      throw new DomainError("El código de la habilidad es obligatorio");
    }

    this.#codigo = codigo;
    this.#titulo = titulo.trim();
    this.#descripcion = descripcion ?? "";
  }

  /**
   * Factory para dar de alta una habilidad nueva a partir de su título:
   * calcula el código automáticamente.
   */
  static crear({ titulo, descripcion }) {
    return new Habilidad({
      codigo: normalizarATituloSnakeCase(titulo),
      titulo,
      descripcion,
    });
  }

  get codigo() {
    return this.#codigo;
  }

  get titulo() {
    return this.#titulo;
  }

  get descripcion() {
    return this.#descripcion;
  }

  equals(otraHabilidad) {
    return otraHabilidad instanceof Habilidad && otraHabilidad.codigo === this.#codigo;
  }

  toJSON() {
    return { codigo: this.#codigo, titulo: this.#titulo, descripcion: this.#descripcion };
  }
}

export { normalizarATituloSnakeCase };
