import mongoose from "mongoose";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError.js";
import { registro } from "../config/registro.js";

export function manejadorErrores(err, req, res, _next) {
  if (err?.type === "entity.too.large") {
    res
      .status(413)
      .json({ message: "El cuerpo de la solicitud supera el límite permitido" });
    return;
  }

  if (err?.type === "encoding.unsupported" || err?.type === "charset.unsupported") {
    res.status(415).json({ message: "Codificación del cuerpo no soportada" });
    return;
  }

  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ message: "JSON malformado en el body" });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ message: "Datos invalidos", issues: err.issues });
    return;
  }

  if (err instanceof AppError) {
    const cuerpo = { message: err.message };
    if (err.codigo) cuerpo.codigo = err.codigo;
    if (err.detalle) cuerpo.detalle = err.detalle;
    res.status(err.status).json(cuerpo);
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({
      message: "Datos invalidos",
      detalle: Object.values(err.errors).map((e) => e.message),
    });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ message: `Identificador invalido: "${err.value}"` });
    return;
  }

  if (err instanceof mongoose.Error.VersionError) {
    res.status(409).json({
      message: "El recurso fue modificado por otro pedido al mismo tiempo. Reintenta.",
    });
    return;
  }

  if (err?.code === 11000) {
    res.status(409).json({ message: "Ya existe un recurso con esos datos" });
    return;
  }

  registro.error("error_http", {
    requestId: req.id,
    metodo: req.method,
    ruta: req.route?.path,
    error: err.message,
    stack: err.stack,
  });
  res.status(500).json({ message: "Error interno del servidor" });
}
