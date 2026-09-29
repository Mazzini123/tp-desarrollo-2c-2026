import { randomUUID } from "node:crypto";

export class Colaboracion {
  constructor({ id = randomUUID(), colaborador, esPublica = true, fecha = new Date() }) {
    this.id = id;
    this.colaborador = colaborador;
    this.fecha = fecha;
    this.esPublica = esPublica;
  }

  // Contribucion anonima: "figurara efectivamente en la plataforma como de
  // costumbre, pero no indicara quien la realizo" — enunciado, 2da entrega.
  // El colaborador sigue en el objeto (el sistema lo necesita para evitar que
  // se anote dos veces); solo se oculta al serializar la respuesta.
  toJSON() {
    return { ...this, colaborador: this.esPublica ? this.colaborador : null };
  }
}
