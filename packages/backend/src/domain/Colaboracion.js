import { randomUUID } from "node:crypto";
import { COLABORACION_ESTADO } from "./enums/COLABORACION_ESTADO.js";

// Una colaboracion arranca como postulacion (PENDIENTE) y el proyecto la
// acepta o la rechaza, a mano o automaticamente segun su modo de aceptacion.
export class Colaboracion {
  constructor({
    id = randomUUID(),
    colaborador,
    esPublica = true,
    fecha = new Date(),
    estado = COLABORACION_ESTADO.PENDIENTE,
    fechaResolucion = null,
  }) {
    this.id = id;
    this.colaborador = colaborador;
    this.fecha = fecha;
    this.esPublica = esPublica;
    this.estado = estado;
    // Cuando se acepto o se rechazo.
    this.fechaResolucion = fechaResolucion;
  }

  estaPendiente() {
    return this.estado === COLABORACION_ESTADO.PENDIENTE;
  }

  estaAceptada() {
    return this.estado === COLABORACION_ESTADO.ACEPTADA;
  }

  aceptar(fecha) {
    this.estado = COLABORACION_ESTADO.ACEPTADA;
    this.fechaResolucion = fecha;
  }

  rechazar(fecha) {
    this.estado = COLABORACION_ESTADO.RECHAZADA;
    this.fechaResolucion = fecha;
  }

  // Contribucion anonima: "figurara efectivamente en la plataforma como de
  // costumbre, pero no indicara quien la realizo" — enunciado, 2da entrega.
  // El colaborador sigue en el objeto (el sistema lo necesita para evitar que
  // se anote dos veces); solo se oculta al serializar la respuesta.
  toJSON() {
    return { ...this, colaborador: this.esPublica ? this.colaborador : null };
  }
}
