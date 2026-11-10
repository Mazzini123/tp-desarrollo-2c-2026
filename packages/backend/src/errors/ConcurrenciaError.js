import { ConflictError } from "./ConflictError.js";

export class ConcurrenciaError extends ConflictError {
  constructor(
    mensaje = "El recurso fue modificado por otro pedido al mismo tiempo. Reintenta.",
  ) {
    super(mensaje);
  }
}
