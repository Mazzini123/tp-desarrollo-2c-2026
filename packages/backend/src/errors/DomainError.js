import { AppError } from "./AppError.js";

export class DomainError extends AppError {
  constructor(mensaje) {
    super(mensaje, 400);
  }
}
