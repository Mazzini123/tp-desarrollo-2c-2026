import { randomUUID } from "node:crypto";
import { ConflictError } from "../errors/ConflictError.js";

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
    // Correccion C1: era `new Set()`. Un Set no tiene representacion en BSON,
    // asi que MongoDB lo guardaria como {} y los pronombres se perderian sin
    // que salte ningun error. La unicidad ahora la garantiza la logica de
    // abajo, no el tipo del atributo.
    this.pronombres = [];
    this.presentacion = presentacion;
    this.habilidades = [];
  }

  tienePronombre(pronombre) {
    return this.pronombres.includes(pronombre);
  }

  /**
   * Agregar de a uno: el duplicado es un error y se le avisa a quien llama.
   * Es la decision que pidio el profesor: "si tu operacion es de agregar un
   * pronombre, yo creo que si lo validaria y tiraria error".
   */
  agregarPronombre(pronombre) {
    if (this.tienePronombre(pronombre)) {
      throw new ConflictError(`El colaborador ya tiene el pronombre "${pronombre}"`);
    }
    this.pronombres.push(pronombre);
  }

  quitarPronombre(pronombre) {
    this.pronombres = this.pronombres.filter((p) => p !== pronombre);
  }

  /**
   * Reemplazo completo: aca el duplicado se descarta en silencio, porque la
   * intencion es "dejame esta lista", no "agregame este". El Set pasa a ser
   * una herramienta de una linea en vez del tipo del atributo.
   */
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
