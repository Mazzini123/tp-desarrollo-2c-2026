import { AUTOR_VALORACION } from "../domain/enums/AUTOR_VALORACION.js";
import { UnauthorizedError } from "../errors/UnauthorizedError.js";
import { ForbiddenError } from "../errors/ForbiddenError.js";
import { crearAutenticacion } from "./autenticacion.js";
import { crearIdentificacion } from "./identificacion.js";
import { crearAutorizacionContextual } from "./autorizarEnContexto.js";
import { colaboradorDelContexto, colectivoDelContexto } from "../domain/contexto.js";

const pasar = (_req, _res, next) => next();

function exigirSesion(req) {
  if (!req.identidad) {
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
    activa: false,
    autenticar: (req, _res, next) => {
      req.autenticacion = null;
      req.usuario = null;
      req.identidad = null;
      req.contexto = null;
      next();
    },
    exigirAutenticacion: pasar,
    usuario: () => pasar,
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

  const identificacion = crearIdentificacion({
    registroService,
    compat: compatContextoImplicito,
  });
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
    const proyecto = await proyectoService.buscarPorId(req.params.id);
    return String(proyecto.colectivoId) === colectivoId;
  };

  const esLaPersonaDeLaColaboracion = async (req) => {
    const colaboradorId = colaboradorDelContexto(req.contexto);
    if (!colaboradorId) {
      return false;
    }
    const proyecto = await proyectoService.buscarPorId(req.params.id);
    const colaboracion = proyecto.buscarColaboracion(req.params.colaboracionId);
    return Boolean(colaboracion?.esDe(colaboradorId));
  };

  const prohibir = () => {
    throw new ForbiddenError("No tenes permiso para hacer esto");
  };

  return {
    activa: true,

    autenticar: crearAutenticacion(autenticador),

    exigirAutenticacion: (req, _res, next) => {
      if (!req.autenticacion) throw identificacion.noAutenticado();
      next();
    },

    usuario: (opciones) => identificacion.exigida(opciones),

    permiso: (codigo = null) => [identificacion.exigida(), contextual.exigida(codigo)],

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
