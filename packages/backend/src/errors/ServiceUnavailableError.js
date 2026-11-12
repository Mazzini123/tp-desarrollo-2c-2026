import { AppError } from "./AppError.js";

export class ServiceUnavailableError extends AppError {
  constructor(mensaje, codigo = null, detalle = null) {
    super(mensaje, 503, codigo, detalle);
  }
}
