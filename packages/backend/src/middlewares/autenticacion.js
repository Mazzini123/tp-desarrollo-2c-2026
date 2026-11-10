function tokenDe(req) {
  const [esquema, token] = (req.get("Authorization") ?? "").split(" ");
  return esquema?.toLowerCase() === "bearer" && token ? token : null;
}

export function crearAutenticacion(autenticador) {
  return async (req, _res, next) => {
    req.autenticacion = null;
    const token = tokenDe(req);
    if (token) {
      req.autenticacion = await autenticador.autenticar(token);
    }
    next();
  };
}
