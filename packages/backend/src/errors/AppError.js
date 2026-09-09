export class AppError extends Error {
  constructor(mensaje, status) {
    super(mensaje);
    this.name = this.constructor.name;
    this.status = status;
  }
}
