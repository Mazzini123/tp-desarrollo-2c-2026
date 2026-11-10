import { AppError } from "./AppError.js";

export class UnauthorizedError extends AppError {
  constructor(mensaje = "Hace falta iniciar sesion", codigo = null) {
    super(mensaje, 401, codigo);
  }
}
