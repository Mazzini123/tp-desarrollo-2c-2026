/**
 * Se registra despues de todas las rutas: si ninguna matcheo, la request llega
 * aca. Tiene tres parametros para que Express lo trate como middleware normal
 * y no como error handler.
 */
export function noEncontrado(_req, res) {
  res.status(404).json({ message: "Recurso no encontrado" });
}
