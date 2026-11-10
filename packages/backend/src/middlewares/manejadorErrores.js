import mongoose from "mongoose";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError.js";

export function manejadorErrores(err, _req, res, _next) {
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
    res.status(400).json({ message: "Datos invalidos", detalle: err.message });
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

  console.error(err);
  res.status(500).json({ message: "Error interno del servidor" });
}
