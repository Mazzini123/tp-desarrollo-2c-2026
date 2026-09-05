import { AppError } from "./AppError.js";

/** 404 Not Found. Se pidió un recurso que no existe. */
export class NotFoundError extends AppError {
  constructor(mensaje) {
    super(mensaje, 404);
  }
}
