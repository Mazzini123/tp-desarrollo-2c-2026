import { randomUUID } from "node:crypto";
import { DomainError } from "./DomainError.js";
import { Habilidad } from "./Habilidad.js";

/**
 * Persona del ámbito del desarrollo que ofrece sus conocimientos a
 * los colectivos.
 *
 * Puede mantenerse anónima usando un nombre de fantasía, indicar su
 * cuenta de git, o además registrar nombre y apellido. Debe existir
 * al menos uno de esos datos de identificación.
 *
 * El id no figura en el diagrama de clases (es un detalle de
 * implementación), pero hace falta para poder referenciar al
 * colaborador desde la API REST.
 */
export class Colaborador {
  #id;
  #nombreFantasia;
  #nombre;
  #apellido;
  #cuentaGit;
  #habilidades;
  #pronombres;
  #presentacion;

  constructor({
    id = randomUUID(),
    nombreFantasia = null,
    nombre = null,
    apellido = null,
    cuentaGit = null,
    pronombres = [],
    presentacion = null,
  }) {
    const tieneNombreYApellido = Boolean(nombre) && Boolean(apellido);

    if (!nombreFantasia && !cuentaGit && !tieneNombreYApellido) {
      throw new DomainError(
        "El colaborador debe tener al menos un dato de identificación: " +
          "nombreFantasia, cuentaGit, o (nombre + apellido)",
      );
    }

    if (!Array.isArray(pronombres)) {
      throw new DomainError("pronombres debe ser una lista");
    }

    this.#id = id;
    this.#nombreFantasia = nombreFantasia;
    this.#nombre = nombre;
    this.#apellido = apellido;
    this.#cuentaGit = cuentaGit;
    this.#pronombres = [...pronombres];
    this.#presentacion = presentacion;
    this.#habilidades = [];
  }

  get id() {
    return this.#id;
  }

  get nombreFantasia() {
    return this.#nombreFantasia;
  }

  get nombre() {
    return this.#nombre;
  }

  get apellido() {
    return this.#apellido;
  }

  get cuentaGit() {
    return this.#cuentaGit;
  }

  get pronombres() {
    return [...this.#pronombres];
  }

  get presentacion() {
    return this.#presentacion;
  }

  get habilidades() {
    return [...this.#habilidades];
  }

  tieneHabilidad(habilidad) {
    return this.#habilidades.some((h) => h.equals(habilidad));
  }

  agregarHabilidad(habilidad) {
    if (!(habilidad instanceof Habilidad)) {
      throw new DomainError("Se esperaba una instancia de Habilidad");
    }
    if (this.tieneHabilidad(habilidad)) {
      return; // idempotente
    }
    this.#habilidades.push(habilidad);
  }

  quitarHabilidad(habilidad) {
    this.#habilidades = this.#habilidades.filter((h) => !h.equals(habilidad));
  }

  actualizarDatos({ pronombres, presentacion }) {
    if (pronombres !== undefined) {
      if (!Array.isArray(pronombres)) {
        throw new DomainError("pronombres debe ser una lista");
      }
      this.#pronombres = [...pronombres];
    }
    if (presentacion !== undefined) {
      this.#presentacion = presentacion;
    }
  }

  toJSON() {
    return {
      id: this.#id,
      nombreFantasia: this.#nombreFantasia,
      nombre: this.#nombre,
      apellido: this.#apellido,
      cuentaGit: this.#cuentaGit,
      pronombres: [...this.#pronombres],
      presentacion: this.#presentacion,
      habilidades: this.#habilidades.map((h) => h.toJSON()),
    };
  }
}
