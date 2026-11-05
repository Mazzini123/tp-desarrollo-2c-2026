import { AppError } from "./AppError.js";

export class ForbiddenError extends AppError {
  constructor(mensaje) {
    super(mensaje, 403);
  }
}
