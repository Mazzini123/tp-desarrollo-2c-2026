/**
 * Helpers de validación compartidos por el dominio.
 *
 * Existen para no repetir el mismo patrón en cada entidad: el
 * conocimiento "un campo obligatorio es el que tiene contenido real"
 * queda en un solo lugar, y el código de las entidades gana
 * expresividad.
 */

/** Un string con contenido real: ni vacío ni sólo espacios. */
export function tieneContenido(valor) {
  return Boolean(valor) && valor.trim().length > 0;
}

/** El valor pertenece a un enumerativo (objeto congelado de constantes). */
export function esValorDeEnum(enumerativo, valor) {
  return Object.values(enumerativo).includes(valor);
}
