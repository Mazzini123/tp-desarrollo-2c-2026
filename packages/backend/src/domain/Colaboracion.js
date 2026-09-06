import { randomUUID } from "node:crypto";

export class Colaboracion {
  constructor({ id = randomUUID(), colaborador, fecha = new Date() }) {
    this.id = id;
    this.colaborador = colaborador;
    this.fecha = fecha;
  }
}
