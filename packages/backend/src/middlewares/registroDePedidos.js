import { registro } from "../config/registro.js";

const SIN_REGISTRO = new Set(["/health", "/ready"]);

export function registroDePedidos(req, res, next) {
  if (SIN_REGISTRO.has(req.path)) return next();
  const inicio = process.hrtime.bigint();
  res.on("finish", () => {
    const milisegundos = Number(process.hrtime.bigint() - inicio) / 1e6;
    registro.info("pedido_http", {
      requestId: req.id,
      metodo: req.method,
      ruta: req.originalUrl,
      estado: res.statusCode,
      ms: Math.round(milisegundos * 10) / 10,
    });
  });
  next();
}
