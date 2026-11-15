import { AppError } from "./AppError.js";

export class BadRequestError extends AppError {
  constructor(mensaje, codigo = null, detalle = null) {
    super(mensaje, 400, codigo, detalle);
  }
}
