import { AppError } from "./AppError.js";

export class BadRequestError extends AppError {
  constructor(mensaje) {
    super(mensaje, 400);
  }
}
