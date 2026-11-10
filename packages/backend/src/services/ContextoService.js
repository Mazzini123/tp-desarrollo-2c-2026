import { TIPO_CONTEXTO } from "../domain/enums/TIPO_CONTEXTO.js";
import { ROL_CUENTA } from "../domain/enums/ROL_CUENTA.js";
import { BadRequestError } from "../errors/BadRequestError.js";
import { ConflictError } from "../errors/ConflictError.js";
import { ForbiddenError } from "../errors/ForbiddenError.js";
import { CODIGO_ERROR } from "../errors/CODIGO_ERROR.js";
import { mismoId } from "../utils/ids.js";

export const contextoRequerido = () =>
  new BadRequestError(
    "Indica con que contexto operas (encabezado X-Context-Id)",
    CODIGO_ERROR.CONTEXTO_REQUERIDO,
  );

export class ContextoService {
  constructor({
    contextoUsuarioRepository,
    usuarioRepository,
    colectivoRepository,
    colaboradorRepository,
    catalogoDeRoles,
  }) {
    this.contextoUsuarioRepository = contextoUsuarioRepository;
    this.usuarioRepository = usuarioRepository;
    this.colectivoRepository = colectivoRepository;
    this.colaboradorRepository = colaboradorRepository;
    this.catalogoDeRoles = catalogoDeRoles;
  }

  async colectivoActivo(colectivoId) {
    const colectivo = await this.colectivoRepository.buscarResumen(String(colectivoId));
    return colectivo && !colectivo.fechaBaja ? colectivo : null;
  }

  async esValido(contexto) {
    if (!contexto?.activo) return false;
    if (contexto.tipo === TIPO_CONTEXTO.COLECTIVO) {
      return Boolean(await this.colectivoActivo(contexto.colectivoId));
    }
    return true;
  }

  async validosDe(usuarioId, tipo = null) {
    const contextos = await this.contextoUsuarioRepository.listarDeUsuario(usuarioId);
    const validos = [];
    for (const contexto of contextos) {
      if ((!tipo || contexto.tipo === tipo) && (await this.esValido(contexto))) {
        validos.push(contexto);
      }
    }
    return validos;
  }

  async exigirSinModalidad(usuarioId, tipo) {
    if ((await this.validosDe(usuarioId, tipo)).length > 0) {
      throw new ConflictError(
        tipo === TIPO_CONTEXTO.COLECTIVO
          ? "La cuenta opera como colectivo: no puede tener ademas un perfil de colaboradora"
          : "La cuenta opera como colaboradora: no puede operar ademas como colectivo",
        CODIGO_ERROR.MODALIDAD_INCOMPATIBLE,
      );
    }
  }

  async describir(contexto) {
    const descripcion = {
      id: contexto.id,
      tipo: contexto.tipo,
      rol: contexto.rol,
      colectivo: null,
      colaborador: null,
      permisos: this.catalogoDeRoles.permisosDe(contexto.rol),
    };
    if (contexto.tipo === TIPO_CONTEXTO.COLECTIVO) {
      const colectivo = await this.colectivoRepository.buscarResumen(
        String(contexto.colectivoId),
      );
      descripcion.colectivo = colectivo
        ? { id: colectivo.id, nombre: colectivo.nombre }
        : null;
    } else {
      const colaborador = await this.colaboradorRepository.buscarPorId(
        String(contexto.colaboradorId),
      );
      descripcion.colaborador = colaborador
        ? { id: colaborador.id, nombre: colaborador.nombreParaMostrar() }
        : null;
    }
    return descripcion;
  }

  async cuentaDe(usuario, sub) {
    const validos = await this.validosDe(usuario._id);
    const actual = validos.find((c) => mismoId(c._id, usuario.contextoActualId)) ?? null;

    return {
      id: sub,
      ...rolYPerfilDe(actual),
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        nombrePendiente: !usuario.nombre,
      },
      contextoActual: actual ? await this.describir(actual) : null,
      contextos: await Promise.all(validos.map((contexto) => this.describir(contexto))),
    };
  }

  async contextoPropio(usuario, contextoId) {
    const contexto = await this.contextoUsuarioRepository.buscarPorId(contextoId);
    if (!contexto || !mismoId(contexto.usuarioId, usuario._id)) {
      throw new ForbiddenError("Ese contexto no es tuyo", CODIGO_ERROR.CONTEXTO_INVALIDO);
    }
    return contexto;
  }

  async exigirValido(contexto) {
    if (!(await this.esValido(contexto))) {
      throw new ForbiddenError(
        "Ese contexto ya no esta activo",
        CODIGO_ERROR.CONTEXTO_INACTIVO,
      );
    }
  }

  async seleccionar(usuario, contextoId) {
    const contexto = await this.contextoPropio(usuario, contextoId);
    await this.exigirValido(contexto);
    await this.usuarioRepository.fijarContextoActual(usuario._id, contexto._id);
    usuario.contextoActualId = contexto._id;
    return this.describir(contexto);
  }

  async limpiarActual(usuario) {
    await this.usuarioRepository.fijarContextoActual(usuario._id, null);
    usuario.contextoActualId = null;
  }

  async resolverEnPedido(usuario, contextoId, { compat = false } = {}) {
    if (contextoId === undefined) {
      if (!compat) throw contextoRequerido();
      const validos = await this.validosDe(usuario._id);
      if (validos.length !== 1 || !mismoId(validos[0]._id, usuario.contextoActualId)) {
        throw contextoRequerido();
      }
      return { contexto: validos[0], implicito: true };
    }

    const contexto = await this.contextoPropio(usuario, contextoId);
    if (!mismoId(usuario.contextoActualId, contexto._id)) {
      throw new ConflictError(
        "Cambiaste de contexto en otra ventana o dispositivo",
        CODIGO_ERROR.CONTEXTO_NO_ACTUAL,
      );
    }
    await this.exigirValido(contexto);
    return { contexto, implicito: false };
  }
}

function rolYPerfilDe(contexto) {
  if (!contexto) {
    return { rol: null, perfilId: null };
  }
  return contexto.tipo === TIPO_CONTEXTO.COLECTIVO
    ? { rol: ROL_CUENTA.COLECTIVO, perfilId: String(contexto.colectivoId) }
    : { rol: ROL_CUENTA.COLABORADORA, perfilId: String(contexto.colaboradorId) };
}
