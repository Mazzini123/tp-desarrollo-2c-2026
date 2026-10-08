export function validarBody(schema) {
  return (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };
}

export function validarQuery(schema) {
  return (req, _res, next) => {
    req.paginacion = schema.parse(req.query);
    next();
  };
}
