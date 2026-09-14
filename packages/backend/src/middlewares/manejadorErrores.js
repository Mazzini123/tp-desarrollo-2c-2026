import { ZodError } from "zod";
import { AppError } from "../errors/AppError.js";

/**
 * Unico lugar del proyecto que traduce una excepcion a una respuesta HTTP.
 *
 * Correccion A1 del coloquio. Los cuatro parametros son obligatorios: asi es
 * como Express reconoce un error handler y le entrega el error. Va registrado
 * al final de la cadena en `app.js`.
 *
 * Los controllers ya no tienen try/catch: tiran (o dejan pasar) la excepcion y
 * Express la trae hasta aca. Express 5 tambien captura las promesas rechazadas,
 * asi que esto va a seguir funcionando cuando los repositorios sean async
 * contra MongoDB en la segunda entrega.
 */
export function manejadorErrores(err, _req, res, _next) {
  // Lo tira express.json() cuando el body no es JSON valido, antes de que
  // exista un controller que lo atienda.
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ message: "JSON malformado en el body" });
    return;
  }

  // Validacion de forma: viene de los middlewares de validar.js.
  if (err instanceof ZodError) {
    res.status(400).json({ message: "Datos invalidos", issues: err.issues });
    return;
  }

  // Reglas de negocio e invariantes de dominio: DomainError, BadRequestError,
  // NotFoundError, ConflictError. Cada una trae su propio status.
  if (err instanceof AppError) {
    res.status(err.status).json({ message: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ message: "Error interno del servidor" });
}
