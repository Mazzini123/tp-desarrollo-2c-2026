import { ForbiddenError } from "../../errors/ForbiddenError.js";
import { noAutenticado } from "../auth/erroresDeAutenticacion.js";
import { CODIGO_ERROR } from "../../errors/CODIGO_ERROR.js";

export function crearIdentificacion({ registroService }) {
  async function exigida(req, _res, next) {
    if (!req.autenticacion) throw noAutenticado();
    const usuario = await registroService.usuarioDe(req.autenticacion);
    if (!usuario) {
      throw new ForbiddenError(
        "Todavia no completaste el registro",
        CODIGO_ERROR.USUARIO_NO_REGISTRADO,
      );
    }
    req.usuario = usuario;
    next();
  }

  async function opcional(req, _res, next) {
    req.usuario = req.autenticacion
      ? await registroService.usuarioDe(req.autenticacion)
      : null;
    next();
  }

  return { exigida, opcional };
}
