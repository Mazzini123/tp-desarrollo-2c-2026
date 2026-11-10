import { ConflictError } from "../errors/ConflictError.js";
import { ForbiddenError } from "../errors/ForbiddenError.js";
import { UnauthorizedError } from "../errors/UnauthorizedError.js";
import { CODIGO_ERROR } from "../errors/CODIGO_ERROR.js";

const noAutenticado = () =>
  new UnauthorizedError("Hace falta iniciar sesion", CODIGO_ERROR.NO_AUTENTICADO);

export function crearIdentificacion({ registroService, compat = false }) {
  function exigida({ registrarSiFalta = false, exigirNombre = false } = {}) {
    return async (req, _res, next) => {
      if (!req.autenticacion) {
        throw noAutenticado();
      }
      let usuario = await registroService.usuarioDe(req.autenticacion);
      if (!usuario && registrarSiFalta && compat) {
        ({ usuario } = await registroService.registrar(req.autenticacion));
      }
      if (!usuario) {
        throw new ForbiddenError(
          "Todavia no completaste el registro",
          CODIGO_ERROR.USUARIO_NO_REGISTRADO,
        );
      }
      const toleradoPorCompatibilidad = compat && registrarSiFalta;
      if (exigirNombre && !usuario.nombre && !toleradoPorCompatibilidad) {
        throw new ConflictError(
          "Antes de continuar, contanos tu nombre",
          CODIGO_ERROR.NOMBRE_REQUERIDO,
        );
      }
      req.usuario = usuario;
      req.identidad = { sub: req.autenticacion.sub };
      next();
    };
  }

  async function opcional(req, _res, next) {
    req.usuario = null;
    if (req.autenticacion) {
      req.usuario = await registroService.usuarioDe(req.autenticacion);
      if (req.usuario) {
        req.identidad = { sub: req.autenticacion.sub };
      }
    }
    next();
  }

  return { exigida, opcional, noAutenticado };
}
