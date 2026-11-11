import { ForbiddenError } from "../../errors/ForbiddenError.js";
import { AppError } from "../../errors/AppError.js";
import { CODIGO_ERROR } from "../../errors/CODIGO_ERROR.js";
import { objectIdSchema } from "../../schemas/comunesSchema.js";
import { contextoRequerido } from "../application/ContextoService.js";
import { registro } from "../../config/registro.js";

const CONTEXTO = "X-Context-Id";

function encabezadoDeContexto(req) {
  const valor = req.get(CONTEXTO);
  if (valor !== undefined && !objectIdSchema.safeParse(valor).success) {
    throw contextoRequerido();
  }
  return valor;
}

function avisarUsoImplicito(req) {
  registro.aviso("contexto_implicito", {
    metodo: req.method,
    ruta: req.originalUrl,
    usuarioId: req.usuario.id,
  });
}

export function crearAutorizacionContextual({
  contextoService,
  catalogoDeRoles,
  compat = false,
  avisar = avisarUsoImplicito,
}) {
  function aplicar(req, res, contexto, implicito) {
    if (implicito) {
      res.set("Deprecation", "true");
      avisar(req);
    }
    req.contexto = contexto;
  }

  function exigida(permiso = null) {
    return async (req, res, next) => {
      const { contexto, implicito } = await contextoService.resolverEnPedido(
        req.usuario,
        encabezadoDeContexto(req),
        { compat },
      );
      if (permiso && !catalogoDeRoles.tienePermiso(contexto.rol, permiso)) {
        throw new ForbiddenError(
          "No tenes permiso para hacer esto",
          CODIGO_ERROR.PERMISO_INSUFICIENTE,
        );
      }
      aplicar(req, res, contexto, implicito);
      next();
    };
  }

  async function opcional(req, res, next) {
    req.contexto = null;
    if (!req.usuario || (req.get(CONTEXTO) === undefined && !compat)) {
      next();
      return;
    }
    const encabezado = encabezadoDeContexto(req);
    try {
      const { contexto, implicito } = await contextoService.resolverEnPedido(
        req.usuario,
        encabezado,
        { compat },
      );
      aplicar(req, res, contexto, implicito);
    } catch (error) {
      const sinContexto =
        encabezado === undefined &&
        error instanceof AppError &&
        error.codigo === CODIGO_ERROR.CONTEXTO_REQUERIDO;
      if (!sinContexto) throw error;
    }
    next();
  }

  return { exigida, opcional };
}
