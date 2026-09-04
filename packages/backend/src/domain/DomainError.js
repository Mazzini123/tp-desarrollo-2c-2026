/**
 * Error de reglas de negocio. Lo lanza el dominio cuando se intenta
 * construir o modificar una entidad de forma inválida.
 * El manejador de errores de Express lo traduce a un 400.
 */
export class DomainError extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = "DomainError";
    this.status = 400;
  }
}
