import { COLABORACION_ESTADO } from "./enums/COLABORACION_ESTADO.js";

export class Colaboracion {
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

  estaFinalizada() {
    return this.estado === COLABORACION_ESTADO.FINALIZADA;
  }

  finalizar(fecha) {
    this.estado = COLABORACION_ESTADO.FINALIZADA;
    this.fechaFin = fecha;
  }

  esDe(colaboradorOId) {
    return idComoTexto(this.colaborador) === idComoTexto(colaboradorOId);
  }

  estaDesvinculada() {
    return this.estado === COLABORACION_ESTADO.DESVINCULADA;
  }

  desvincular(fecha) {
    this.estado = COLABORACION_ESTADO.DESVINCULADA;
    this.fechaFin = fecha;
  }
}

function idComoTexto(valor) {
  return String(valor?._id ?? valor);
}
