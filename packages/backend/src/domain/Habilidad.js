import { DomainError } from "./DomainError.js";

function normalizarASnakeCase(titulo) {
  return titulo
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // saca acentos
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Catálogo global de habilidades, precargado por el equipo
 * administrativo de la plataforma. Los proyectos y los colaboradores
 * sólo pueden referenciar habilidades de este catálogo, nunca
 * inventar una nueva.
 *
 * El código, por ahora, es el título normalizado en snake_case.
 *
 * fechaCreacion, usuario y activo son datos de auditoría: permiten
 * dar de baja una habilidad sin borrarla (los proyectos que ya la
 * referencian siguen siendo válidos).
 */
export class Habilidad {
  #titulo;
  #codigo;
  #descripcion;
  #fechaCreacion;
  #usuario;
  #activo;

  constructor({
    titulo,
    codigo,
    descripcion = "",
    fechaCreacion = new Date(),
    usuario = "admin",
    activo = true,
  }) {
    if (!titulo || titulo.trim().length === 0) {
      throw new DomainError("El título de la habilidad es obligatorio");
    }
    if (!codigo || codigo.trim().length === 0) {
      throw new DomainError("El código de la habilidad es obligatorio");
    }
    if (!(fechaCreacion instanceof Date) || Number.isNaN(fechaCreacion.getTime())) {
      throw new DomainError("fechaCreacion debe ser una fecha válida");
    }

    this.#titulo = titulo.trim();
    this.#codigo = codigo;
    this.#descripcion = descripcion;
    this.#fechaCreacion = fechaCreacion;
    this.#usuario = usuario;
    this.#activo = activo;
  }

  /** Alta de una habilidad nueva: calcula el código desde el título. */
  static crear({ titulo, descripcion, usuario }) {
    return new Habilidad({
      titulo,
      codigo: normalizarASnakeCase(titulo),
      descripcion,
      usuario,
    });
  }

  get titulo() {
    return this.#titulo;
  }

  get codigo() {
    return this.#codigo;
  }

  get descripcion() {
    return this.#descripcion;
  }

  get fechaCreacion() {
    return this.#fechaCreacion;
  }

  get usuario() {
    return this.#usuario;
  }

  get activo() {
    return this.#activo;
  }

  desactivar() {
    this.#activo = false;
  }

  activar() {
    this.#activo = true;
  }

  equals(otra) {
    return otra instanceof Habilidad && otra.codigo === this.#codigo;
  }

  toJSON() {
    return {
      titulo: this.#titulo,
      codigo: this.#codigo,
      descripcion: this.#descripcion,
      fechaCreacion: this.#fechaCreacion.toISOString(),
      usuario: this.#usuario,
      activo: this.#activo,
    };
  }
}

export { normalizarASnakeCase };
