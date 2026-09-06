import { AppError } from "./AppError.js";

/**
 * 400 Bad Request. Validación superficial: la petición está mal
 * formada y se detecta mirando sólo la request, sin consultar el
 * estado del sistema. Por ejemplo, "page debe ser un entero
 * positivo".
 */
export class BadRequestError extends AppError {
  constructor(mensaje) {
    super(mensaje, 400);
  }
}
