import { AppError } from "./AppError.js";

export class NotFoundError extends AppError {
  constructor(mensaje) {
    super(mensaje, 404);
  }
}
