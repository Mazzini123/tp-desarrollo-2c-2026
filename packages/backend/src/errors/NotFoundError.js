import { AppError } from "./AppError.js";

export class NotFoundError extends AppError {
  constructor(mensaje, codigo = null, detalle = null) {
    super(mensaje, 404, codigo, detalle);
  }
}
