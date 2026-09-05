import { randomUUID } from "node:crypto";
import { DomainError } from "../errors/index.js";
import { Habilidad } from "./Habilidad.js";

/**
 * Persona del ámbito del desarrollo que ofrece sus conocimientos.
 *
 * Puede mantenerse anónima con un nombre de fantasía, indicar su
 * cuenta de git, o registrar nombre y apellido. Debe existir al menos
 * uno de esos datos de identificación.
 *
 * El id no figura en el diagrama de clases (es un detalle de
 * implementación), pero hace falta para referenciar al colaborador
 * desde la API REST.
 */
export class Colaborador {
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

    this.id = id;
    this.nombreFantasia = nombreFantasia;
    this.nombre = nombre;
    this.apellido = apellido;
    this.cuentaGit = cuentaGit;
    this.pronombres = pronombres;
    this.presentacion = presentacion;
    this.habilidades = [];
  }

  tieneHabilidad(habilidad) {
    return this.habilidades.some((h) => h.equals(habilidad));
  }

  agregarHabilidad(habilidad) {
    if (!(habilidad instanceof Habilidad)) {
      throw new DomainError("Se esperaba una instancia de Habilidad");
    }
    if (this.tieneHabilidad(habilidad)) {
      return; // idempotente
    }
    this.habilidades.push(habilidad);
  }

  quitarHabilidad(habilidad) {
    this.habilidades = this.habilidades.filter((h) => !h.equals(habilidad));
  }

  actualizarDatos({ pronombres, presentacion }) {
    if (pronombres !== undefined) {
      this.pronombres = pronombres;
    }
    if (presentacion !== undefined) {
      this.presentacion = presentacion;
    }
  }
}
