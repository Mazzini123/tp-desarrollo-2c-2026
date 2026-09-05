import { AppError } from "./AppError.js";

/**
 * 409 Conflict. La petición es válida en su forma, pero choca con el
 * estado actual de los recursos: un código de habilidad que ya
 * existe, un colaborador ya anotado, un proyecto ya finalizado.
 */
export class ConflictError extends AppError {
  constructor(mensaje) {
    super(mensaje, 409);
  }
}
