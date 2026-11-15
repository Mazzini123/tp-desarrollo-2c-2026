export function validarBody(schema) {
  return (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };
}

export function validarQuery(schema) {
  return (req, _res, next) => {
    req.consulta = schema.parse(req.query);
    next();
  };
}

export function validarParams(schema) {
  return (req, _res, next) => {
    req.parametros = schema.parse(req.params);
    next();
  };
}

export function validarHeaders(schema) {
  return (req, _res, next) => {
    req.encabezados = schema.parse(req.headers);
    next();
  };
}
