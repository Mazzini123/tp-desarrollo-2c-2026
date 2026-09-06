import { randomUUID } from "node:crypto";

export class Colectivo {
  constructor({ id = randomUUID(), nombre, descripcion, tipoColectivo, ubicacion = null }) {
    this.id = id;
    this.nombre = nombre;
    this.descripcion = descripcion;
    this.tipoColectivo = tipoColectivo;
    this.ubicacion = ubicacion;
    this.proyectos = [];
  }

  agregarProyecto(proyecto) {
    this.proyectos.push(proyecto);
  }
}
