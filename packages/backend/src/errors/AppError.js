export class AppError extends Error {
  constructor(mensaje, status, codigo = null, detalle = null) {
    super(mensaje);
    this.name = this.constructor.name;
    this.status = status;
    this.codigo = codigo;
    this.detalle = detalle;
  }
}
