import { AppError } from "./AppError.js";

/**
 * 400 Bad Request. Violación de una regla de negocio o datos que no
 * cumplen las invariantes de una entidad.
 */
export class DomainError extends AppError {
  constructor(mensaje) {
    super(mensaje, 400);
  }
}
