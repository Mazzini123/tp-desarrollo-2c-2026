import { randomUUID } from "node:crypto";

export class Colaboracion {
  constructor({ id = randomUUID(), colaborador, esPublica = true, fecha = new Date() }) {
    this.id = id;
    this.colaborador = colaborador;
    this.fecha = fecha;
    this.esPublica = esPublica;
  }
}
