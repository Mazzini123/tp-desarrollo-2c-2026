import { noAutenticado, tokenInvalido } from "../auth/erroresDeAutenticacion.js";

export function exigirAutenticacion(req, _res, next) {
  if (!req.autenticacion) throw noAutenticado();
  next();
}

export function crearAutenticacion(autenticador) {
  return async (req, _res, next) => {
    req.autenticacion = null;
    const encabezado = req.get("Authorization");
    if (encabezado !== undefined) {
      const coincidencia = /^Bearer +([A-Za-z0-9._~+/-]+=*)$/i.exec(encabezado);
      if (!coincidencia) throw tokenInvalido();
      req.autenticacion = await autenticador.autenticar(coincidencia[1]);
    }
    next();
  };
}
