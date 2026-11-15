import { ConflictError } from "./ConflictError.js";

export class DuplicadoError extends ConflictError {
  constructor(
    mensaje = "Ya existe un recurso con esos datos",
    codigo = null,
    detalle = null,
  ) {
    super(mensaje, codigo, detalle);
  }
}
