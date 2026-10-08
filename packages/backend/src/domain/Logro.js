import { randomUUID } from "node:crypto";

export class Logro {
  constructor({ id = randomUUID(), titulo, descripcion, fecha = new Date() }) {
    this.id = id
    this.titulo = titulo;
    this.descripcion = descripcion;
    this.fecha = fecha;
  }
}