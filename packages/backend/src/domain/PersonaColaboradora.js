import { randomUUID } from "node:crypto";
import { DomainError } from "./DomainError.js";
import { Habilidad } from "./Habilidad.js";

/**
 * Entidad. Persona del ámbito del desarrollo que ofrece sus
 * conocimientos a los colectivos.
 *
 * Debe existir al menos uno de estos datos de identificación:
 * nombreDeFantasia, cuentaDeDesarrollo, o (nombre + apellido).
 *
 * datosDeContacto se deja mínimo a propósito: la Segunda Entrega
 * lo reemplaza por una colección de medios de contacto tipados.
 */
export class PersonaColaboradora {
  #id;
  #nombreDeFantasia;
  #cuentaDeDesarrollo;
  #nombre;
  #apellido;
  #pronombres;
  #presentacion;
  #datosDeContacto;
  #habilidades;

  constructor({
    id = randomUUID(),
    nombreDeFantasia = null,
    cuentaDeDesarrollo = null,
    nombre = null,
    apellido = null,
    pronombres = null,
    presentacion = null,
    datosDeContacto,
  }) {
    const tieneNombreYApellido = Boolean(nombre) && Boolean(apellido);

    if (!nombreDeFantasia && !cuentaDeDesarrollo && !tieneNombreYApellido) {
      throw new DomainError(
        "La persona colaboradora debe tener al menos un dato de identificación: " +
          "nombreDeFantasia, cuentaDeDesarrollo, o (nombre + apellido)",
      );
    }

    if (!datosDeContacto || datosDeContacto.trim().length === 0) {
      throw new DomainError("datosDeContacto es obligatorio");
    }

    this.#id = id;
    this.#nombreDeFantasia = nombreDeFantasia;
    this.#cuentaDeDesarrollo = cuentaDeDesarrollo;
    this.#nombre = nombre;
    this.#apellido = apellido;
    this.#pronombres = pronombres;
    this.#presentacion = presentacion;
    this.#datosDeContacto = datosDeContacto;
    this.#habilidades = [];
  }

  get id() {
    return this.#id;
  }

  get nombreDeFantasia() {
    return this.#nombreDeFantasia;
  }

  get cuentaDeDesarrollo() {
    return this.#cuentaDeDesarrollo;
  }

  get nombre() {
    return this.#nombre;
  }

  get apellido() {
    return this.#apellido;
  }

  get pronombres() {
    return this.#pronombres;
  }

  get presentacion() {
    return this.#presentacion;
  }

  get datosDeContacto() {
    return this.#datosDeContacto;
  }

  get habilidades() {
    return [...this.#habilidades];
  }

  agregarHabilidad(habilidad) {
    if (!(habilidad instanceof Habilidad)) {
      throw new DomainError("Se esperaba una instancia de Habilidad");
    }
    if (this.tieneHabilidad(habilidad)) {
      return; // idempotente: agregar dos veces la misma habilidad no es un error
    }
    this.#habilidades.push(habilidad);
  }

  tieneHabilidad(habilidad) {
    return this.#habilidades.some((h) => h.equals(habilidad));
  }

  quitarHabilidad(habilidad) {
    this.#habilidades = this.#habilidades.filter((h) => !h.equals(habilidad));
  }

  /**
   * Edición de datos editables (pronombres, presentación, datos de
   * contacto). No permite cambiar los datos de identificación
   * (nombre/apellido/nombreDeFantasia/cuentaDeDesarrollo): cambiarlos
   * es una decisión de negocio distinta que esta operación
   * estructural simple no contempla.
   */
  actualizarDatos({ pronombres, presentacion, datosDeContacto }) {
    if (pronombres !== undefined) {
      this.#pronombres = pronombres;
    }
    if (presentacion !== undefined) {
      this.#presentacion = presentacion;
    }
    if (datosDeContacto !== undefined) {
      if (!datosDeContacto || datosDeContacto.trim().length === 0) {
        throw new DomainError("datosDeContacto es obligatorio");
      }
      this.#datosDeContacto = datosDeContacto;
    }
  }

  /**
   * Una persona es anónima cuando no reveló nombre y apellido reales,
   * es decir, se identifica sólo por nombreDeFantasia y/o cuenta de
   * desarrollo (github/gitlab).
   */
  esAnonima() {
    return !this.#nombre && !this.#apellido;
  }

  /**
   * Nombre a mostrar públicamente, respetando el anonimato:
   * prioriza nombre y apellido reales; si no existen, cae a
   * nombreDeFantasia y luego a la cuenta de desarrollo.
   */
  nombreVisible() {
    if (this.#nombre && this.#apellido) {
      return `${this.#nombre} ${this.#apellido}`;
    }
    if (this.#nombreDeFantasia) {
      return this.#nombreDeFantasia;
    }
    return this.#cuentaDeDesarrollo;
  }

  toJSON() {
    return {
      id: this.#id,
      nombreDeFantasia: this.#nombreDeFantasia,
      cuentaDeDesarrollo: this.#cuentaDeDesarrollo,
      nombre: this.#nombre,
      apellido: this.#apellido,
      pronombres: this.#pronombres,
      presentacion: this.#presentacion,
      esAnonima: this.esAnonima(),
      habilidades: this.#habilidades.map((h) => h.toJSON()),
    };
  }
}
