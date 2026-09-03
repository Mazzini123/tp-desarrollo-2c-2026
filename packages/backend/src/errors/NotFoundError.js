/**
 * Error de aplicación (no de dominio): se pide un recurso que no
 * existe en el repositorio. Lo lanzan los services, no las entidades,
 * porque buscar por id es un detalle de infraestructura, no una
 * regla de negocio.
 */
export class NotFoundError extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = "NotFoundError";
    this.status = 404;
  }
}
