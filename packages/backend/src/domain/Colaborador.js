import { randomUUID } from "node:crypto";
import { ConflictError } from "../errors/ConflictError.js";

export class Colaborador {
  constructor({
    id = randomUUID(),
    recibeMensajeriaInterna = true,
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
    this.pronombres = [];
    this.presentacion = presentacion;
    this.habilidades = [];
    this.recibeMensajeriaInterna = recibeMensajeriaInterna;
    this.mediosDeContacto = [];
  }

  tienePronombre(pronombre) {
    return this.pronombres.includes(pronombre);
  }

  agregarMedioDeContacto(medioDeContacto) {
    this.mediosDeContacto.push(medioDeContacto);
  }

  quitarMedioDeContacto(medioDeContacto) {
    this.mediosDeContacto = this.mediosDeContacto.filter((mc) => mc !== medioDeContacto);
  }

  agregarPronombre(pronombre) {
    if (this.tienePronombre(pronombre)) {
      throw new ConflictError(`El colaborador ya tiene el pronombre "${pronombre}"`);
    }
    this.pronombres.push(pronombre);
  }

  quitarPronombre(pronombre) {
    this.pronombres = this.pronombres.filter((p) => p !== pronombre);
  }

  reemplazarPronombres(pronombres) {
    this.pronombres = [...new Set(pronombres)];
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
