/**
 * Middlewares de validacion de la entrada HTTP.
 *
 * Correccion A2 del coloquio: la validacion de forma dejo de vivir dentro de
 * cada metodo del controller y pasa a declararse en el router, como middleware
 * intermedio. Ver `routes/*.js`.
 *
 * Usan `schema.parse` (no `safeParse`) a proposito: el ZodError que tiran lo
 * traduce a HTTP 400 el manejador de errores del final de la cadena.
 * Ver `middlewares/manejadorErrores.js` (correccion A1).
 */

export function validarBody(schema) {
  return (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };
}

/**
 * Deja el resultado en `req.paginacion` en vez de sobreescribir `req.query`,
 * que en Express 5 es un getter y no se puede reasignar.
 */
export function validarQuery(schema) {
  return (req, _res, next) => {
    req.paginacion = schema.parse(req.query);
    next();
  };
}
