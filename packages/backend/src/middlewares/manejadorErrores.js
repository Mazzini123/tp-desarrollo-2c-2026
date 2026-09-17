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
    res.status(err.status).json({ message: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ message: "Error interno del servidor" });
}
