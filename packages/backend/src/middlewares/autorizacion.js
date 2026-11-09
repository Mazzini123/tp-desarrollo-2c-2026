import { ROL_CUENTA } from "../domain/enums/ROL_CUENTA.js";
import { AUTOR_VALORACION } from "../domain/enums/AUTOR_VALORACION.js";
import { UnauthorizedError } from "../errors/UnauthorizedError.js";
import { ForbiddenError } from "../errors/ForbiddenError.js";
import { ConflictError } from "../errors/ConflictError.js";

const pasar = (_req, _res, next) => next();

function tokenDe(req) {
  const [esquema, token] = (req.get("Authorization") ?? "").split(" ");
  return esquema?.toLowerCase() === "bearer" && token ? token : null;
}

function exigirSesion(req) {
  if (!req.identidad) {
    throw new UnauthorizedError();
  }
}

function exigirRol(req, rol, perfilId) {
  exigirSesion(req);
  const mismoPerfil =
    perfilId === undefined || String(req.cuenta.perfilId) === String(perfilId);
  if (req.cuenta.rol !== rol || !mismoPerfil) {
    throw new ForbiddenError("No tenes permiso para hacer esto");
  }
}

export function autorizacionDesactivada() {
  return {
    activa: false,
    identificar: (req, _res, next) => {
      req.identidad = null;
      req.cuenta = null;
      next();
    },
    sesion: pasar,
    sinPerfil: pasar,
    colaboradoraDe: () => pasar,
    colectivoDe: () => pasar,
    duenoDelProyecto: pasar,
    colaboradoraDelBody: pasar,
    participanteDeLaColaboracion: () => pasar,
    autorDeLaValoracion: pasar,
  };
}

export function crearAutorizacion({ verificador, cuentaService, proyectoService }) {
  if (!verificador) {
    return autorizacionDesactivada();
  }

  const guarda = (comprobar) => async (req, _res, next) => {
    await comprobar(req);
    next();
  };

  const esDuenoDelProyecto = async (req) => {
    if (req.cuenta?.rol !== ROL_CUENTA.COLECTIVO) {
      return false;
    }
    const { colectivo } = await proyectoService.buscarProyectoConColectivo(req.params.id);
    return String(colectivo.id) === String(req.cuenta.perfilId);
  };

  const esLaPersonaDeLaColaboracion = async (req) => {
    if (req.cuenta?.rol !== ROL_CUENTA.COLABORADORA) {
      return false;
    }
    const { proyecto } = await proyectoService.buscarProyectoConColectivo(req.params.id);
    const colaboracion = proyecto.buscarColaboracion(req.params.colaboracionId);
    return Boolean(colaboracion?.esDe(req.cuenta.perfilId));
  };

  const prohibir = () => {
    throw new ForbiddenError("No tenes permiso para hacer esto");
  };

  return {
    activa: true,

    async identificar(req, _res, next) {
      req.identidad = null;
      req.cuenta = null;
      const token = tokenDe(req);
      if (token) {
        const { sub } = await verificador.verificar(token);
        req.identidad = { sub };
        req.cuenta = await cuentaService.resolver(sub);
      }
      next();
    },

    sesion: guarda(exigirSesion),

    sinPerfil: guarda((req) => {
      exigirSesion(req);
      if (req.cuenta.rol) {
        throw new ConflictError("La cuenta ya tiene un perfil");
      }
    }),

    colaboradoraDe: (parametro = "id") =>
      guarda((req) => exigirRol(req, ROL_CUENTA.COLABORADORA, req.params[parametro])),

    colectivoDe: (parametro = "id") =>
      guarda((req) => exigirRol(req, ROL_CUENTA.COLECTIVO, req.params[parametro])),

    duenoDelProyecto: guarda(async (req) => {
      exigirSesion(req);
      if (!(await esDuenoDelProyecto(req))) {
        prohibir();
      }
    }),

    colaboradoraDelBody: guarda((req) =>
      exigirRol(req, ROL_CUENTA.COLABORADORA, req.body.colaboradorId),
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
