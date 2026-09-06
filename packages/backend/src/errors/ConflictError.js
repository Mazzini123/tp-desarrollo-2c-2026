import { AppError } from "./AppError.js";

export class ConflictError extends AppError {
  constructor(mensaje) {
    super(mensaje, 409);
  }
}
