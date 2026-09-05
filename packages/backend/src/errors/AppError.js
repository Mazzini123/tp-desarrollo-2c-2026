/**
 * Clase base de los errores de la aplicación. Concentra el nombre y
 * el código HTTP para que las subclases sólo tengan que declarar su
 * status, y para que el manejador de errores de Express pueda
 * responder con err.status sin conocer cada tipo concreto.
 */
export class AppError extends Error {
  constructor(mensaje, status) {
    super(mensaje);
    this.name = this.constructor.name;
    this.status = status;
  }
}
