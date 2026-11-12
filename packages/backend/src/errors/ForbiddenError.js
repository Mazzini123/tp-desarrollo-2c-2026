import { AppError } from "./AppError.js";

export class ForbiddenError extends AppError {
  constructor(mensaje, codigo = null, detalle = null) {
    super(mensaje, 403, codigo, detalle);
  }
}
