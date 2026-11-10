import { AppError } from "./AppError.js";

export class ConflictError extends AppError {
  constructor(mensaje, codigo = null, detalle = null) {
    super(mensaje, 409, codigo, detalle);
  }
}
