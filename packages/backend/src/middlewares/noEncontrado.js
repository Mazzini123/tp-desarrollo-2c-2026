import { NotFoundError } from "../errors/NotFoundError.js";

export function noEncontrado(_req, _res, next) {
  next(new NotFoundError("Recurso no encontrado"));
}
