import { AppError } from "./AppError.js";

export class DomainError extends AppError {
  constructor(mensaje, codigo = null, detalle = null) {
    super(mensaje, 422, codigo, detalle);
  }
}
