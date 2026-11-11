import { AUTOR_VALORACION } from "../domain/enums/AUTOR_VALORACION.js";
import { UnauthorizedError } from "../errors/UnauthorizedError.js";
import { ConflictError } from "../errors/ConflictError.js";
import { CODIGO_ERROR } from "../errors/CODIGO_ERROR.js";
import { ForbiddenError } from "../errors/ForbiddenError.js";
import {
  crearAutenticacion,
  exigirAutenticacion,
} from "../security/http/autenticacion.js";
import { crearIdentificacion } from "../security/http/identificacion.js";
import { crearAutorizacionContextual } from "../security/http/autorizarEnContexto.js";
import {
  colaboradorDelContexto,
  colectivoDelContexto,
} from "../security/http/contexto.js";

const pasar = (_req, _res, next) => next();

const sinAutenticacionHabilitada = () => {
  throw new UnauthorizedError(
    "Esta operacion necesita la autenticacion habilitada",
    CODIGO_ERROR.NO_AUTENTICADO,
  );
};

function exigirSesion(req) {
  if (!req.usuario) {
    throw new UnauthorizedError();
  }
}

function exigirEntidad(req, entidadDelContexto, id) {
  exigirSesion(req);
  const propia = entidadDelContexto(req.contexto);
  if (!propia || (id !== undefined && propia !== String(id))) {
    throw new ForbiddenError("No tenes permiso para hacer esto");
  }
}

export function autorizacionDesactivada() {
  return {
    soloConAutenticacion: sinAutenticacionHabilitada,
    autenticar: (req, _res, next) => {
      req.autenticacion = null;
      req.usuario = null;
      req.contexto = null;
      next();
    },
    exigirAutenticacion,
    usuario: () => pasar,
    nombre: pasar,
    permiso: () => pasar,
    opcional: pasar,
    colaboradoraDe: () => pasar,
    colectivoDe: () => pasar,
    duenoDelProyecto: pasar,
    colaboradoraDelBody: pasar,
    participanteDeLaColaboracion: () => pasar,
    autorDeLaValoracion: pasar,
  };
}

export function crearAutorizacion({
  autenticador,
  registroService,
  contextoService,
  catalogoDeRoles,
  proyectoService,
  compatContextoImplicito = false,
  avisarContextoImplicito,
}) {
  if (!autenticador) {
    return autorizacionDesactivada();
  }

  const identificacion = crearIdentificacion({ registroService });
  const contextual = crearAutorizacionContextual({
    contextoService,
    catalogoDeRoles,
    compat: compatContextoImplicito,
    avisar: avisarContextoImplicito,
  });

  const guarda = (comprobar) => async (req, _res, next) => {
    await comprobar(req);
    next();
  };

  const esDuenoDelProyecto = async (req) => {
    const colectivoId = colectivoDelContexto(req.contexto);
    if (!colectivoId) {
      return false;
    }
    return (await proyectoService.colectivoIdDe(req.params.id)) === colectivoId;
  };

  const esLaPersonaDeLaColaboracion = async (req) => {
    const colaboradorId = colaboradorDelContexto(req.contexto);
    if (!colaboradorId) {
      return false;
    }
    const duena = await proyectoService.colaboradorIdDe(
      req.params.id,
      req.params.colaboracionId,
    );
    return duena === colaboradorId;
  };

  const prohibir = () => {
    throw new ForbiddenError("No tenes permiso para hacer esto");
  };

  return {
    soloConAutenticacion: pasar,

    autenticar: crearAutenticacion(autenticador),

    exigirAutenticacion,

    usuario: () => identificacion.exigida,

    nombre: guarda((req) => {
      if (!req.usuario.nombre) {
        throw new ConflictError(
          "Antes de continuar, contanos tu nombre",
          CODIGO_ERROR.NOMBRE_REQUERIDO,
        );
      }
    }),

    permiso: (codigo = null) => [identificacion.exigida, contextual.exigida(codigo)],

    opcional: [identificacion.opcional, contextual.opcional],

    colaboradoraDe: (parametro = "id") =>
      guarda((req) => exigirEntidad(req, colaboradorDelContexto, req.params[parametro])),

    colectivoDe: (parametro = "id") =>
      guarda((req) => exigirEntidad(req, colectivoDelContexto, req.params[parametro])),

    duenoDelProyecto: guarda(async (req) => {
      exigirSesion(req);
      if (!(await esDuenoDelProyecto(req))) {
        prohibir();
      }
    }),

    colaboradoraDelBody: guarda((req) =>
      exigirEntidad(req, colaboradorDelContexto, req.body.colaboradorId),
    ),

    participanteDeLaColaboracion: ({ colectivo = true, colaboradora = true } = {}) =>
      guarda(async (req) => {
        exigirSesion(req);
        const permitido =
          (colectivo && (await esDuenoDelProyecto(req))) ||
          (colaboradora && (await esLaPersonaDeLaColaboracion(req)));
        if (!permitido) {
          prohibir();
        }
      }),

    autorDeLaValoracion: guarda(async (req) => {
      exigirSesion(req);
      const permitido =
        req.body.autor === AUTOR_VALORACION.COLECTIVO
          ? await esDuenoDelProyecto(req)
          : await esLaPersonaDeLaColaboracion(req);
      if (!permitido) {
        prohibir();
      }
    }),
  };
}
