import { AppError } from "./AppError.js";

export class UnauthorizedError extends AppError {
  constructor(mensaje = "Hace falta iniciar sesion") {
    super(mensaje, 401);
  }
}
