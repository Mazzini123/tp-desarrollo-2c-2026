import { COLABORACION_ESTADO } from "./enums/COLABORACION_ESTADO.js";

// Una colaboracion arranca como postulacion (PENDIENTE) y el proyecto la
// acepta o la rechaza, a mano o automaticamente segun su modo de aceptacion.
//
// Vive embebida en el proyecto: colaboracionSchema (models/ColectivoModel.js)
// carga esta clase con loadClass. El colaborador se guarda por referencia
// (ObjectId) y el repositorio lo trae con populate.
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

  // Si la hizo esa persona. Acepta el colaborador o su id, y funciona tanto
  // con el colaborador poblado (un documento) como sin poblar (un ObjectId).
  esDe(colaboradorOId) {
    return idComoTexto(this.colaborador) === idComoTexto(colaboradorOId);
  }
}

// Un documento y un ObjectId tienen _id (Mongoose se lo agrega al ObjectId);
// un id que llega de la URL es un string.
function idComoTexto(valor) {
  return String(valor?._id ?? valor);
}
