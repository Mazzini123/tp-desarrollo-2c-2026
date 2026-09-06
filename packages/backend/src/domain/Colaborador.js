import { randomUUID } from "node:crypto";

export class Colaborador {
  constructor({
    id = randomUUID(),
    nombreFantasia = null,
    nombre = null,
    apellido = null,
    cuentaGit = null,
    presentacion = null,
  }) {
    this.id = id;
    this.nombreFantasia = nombreFantasia;
    this.nombre = nombre;
    this.apellido = apellido;
    this.cuentaGit = cuentaGit;
    this.pronombres = new Set();
    this.presentacion = presentacion;
    this.habilidades = [];
  }

  agregarPronombre(pronombre) {
    this.pronombres.add(pronombre);
  }

  quitarPronombre(pronombre) {
    this.pronombres.delete(pronombre);
  }

  tieneHabilidad(habilidad) {
    return this.habilidades.some((h) => h.equals(habilidad));
  }

  agregarHabilidad(habilidad) {
    if (this.tieneHabilidad(habilidad)) {
      return;
    }
    this.habilidades.push(habilidad);
  }

  quitarHabilidad(habilidad) {
    this.habilidades = this.habilidades.filter((h) => !h.equals(habilidad));
  }
}
