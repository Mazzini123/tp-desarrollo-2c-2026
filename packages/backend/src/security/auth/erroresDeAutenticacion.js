import { UnauthorizedError } from "../../errors/UnauthorizedError.js";
import { CODIGO_ERROR } from "../../errors/CODIGO_ERROR.js";

export const noAutenticado = () =>
  new UnauthorizedError("Hace falta iniciar sesion", CODIGO_ERROR.NO_AUTENTICADO);

export const tokenInvalido = () =>
  new UnauthorizedError("La sesion no es valida o vencio", CODIGO_ERROR.TOKEN_INVALIDO);
