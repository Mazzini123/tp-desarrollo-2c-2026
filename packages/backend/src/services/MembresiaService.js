import { TIPO_CONTEXTO } from "../domain/enums/TIPO_CONTEXTO.js";
import { ROL } from "../domain/enums/ROL.js";
import { ESTADO_SOLICITUD } from "../domain/enums/ESTADO_SOLICITUD.js";
import { ConflictError } from "../errors/ConflictError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { CODIGO_ERROR } from "../errors/CODIGO_ERROR.js";
import { mismoId } from "../utils/ids.js";
import { DuplicadoError } from "../errors/DuplicadoError.js";

export class MembresiaService {
  constructor({
    transacciones,
    contextoService,
    contextoUsuarioRepository,
    solicitudIngresoRepository,
    usuarioRepository,
    colectivoRepository,
    colectivoService,
  }) {
    this.transacciones = transacciones;
    this.colectivoService = colectivoService;
    this.contextoService = contextoService;
    this.contextoUsuarioRepository = contextoUsuarioRepository;
    this.solicitudIngresoRepository = solicitudIngresoRepository;
    this.usuarioRepository = usuarioRepository;
    this.colectivoRepository = colectivoRepository;
  }

  async colectivoActivo(colectivoId) {
    const colectivo = await this.colectivoRepository.buscarResumen(String(colectivoId));
    if (!colectivo) {
      throw new NotFoundError(`No existe un colectivo con id "${colectivoId}"`);
    }
    if (colectivo.fechaBaja) {
      throw new ConflictError(
        "El colectivo esta dado de baja",
        CODIGO_ERROR.COLECTIVO_DADO_DE_BAJA,
      );
    }
    return colectivo;
  }

  async esMiembro(usuarioId, colectivoId) {
    const contexto = await this.contextoUsuarioRepository.buscarDeUsuarioEnColectivo(
      usuarioId,
      colectivoId,
    );
    return Boolean(contexto?.activo);
  }

  async conUsuarios(solicitudes) {
    const usuarios = await this.usuarioRepository.buscarVarios(
      solicitudes.map((s) => s.usuarioId),
    );
    return solicitudes.map((solicitud) => {
      const usuario = usuarios.find((u) => mismoId(u._id, solicitud.usuarioId));
      return {
        ...solicitud.toJSON(),
        usuario: { id: String(solicitud.usuarioId), nombre: usuario?.nombre ?? null },
      };
    });
  }

  async solicitarIngreso(usuario, colectivoId) {
    await this.colectivoActivo(colectivoId);

    return this.transacciones.ejecutar(async () => {
      await this.usuarioRepository.bloquear(usuario._id);
      await this.contextoService.exigirSinModalidad(
        usuario._id,
        TIPO_CONTEXTO.COLABORADOR,
      );
      if (await this.esMiembro(usuario._id, colectivoId)) {
        throw new ConflictError(
          "Ya sos miembro de este colectivo",
          CODIGO_ERROR.YA_ES_MIEMBRO,
        );
      }
      if (
        await this.solicitudIngresoRepository.buscarPendiente(colectivoId, usuario._id)
      ) {
        throw this.yaPendiente();
      }
      try {
        return await this.solicitudIngresoRepository.crear({
          colectivoId,
          usuarioId: usuario._id,
        });
      } catch (error) {
        throw error instanceof DuplicadoError ? this.yaPendiente() : error;
      }
    });
  }

  yaPendiente() {
    return new ConflictError(
      "Ya tenes una solicitud pendiente para este colectivo",
      CODIGO_ERROR.SOLICITUD_PENDIENTE,
    );
  }

  yaResuelta() {
    return new ConflictError(
      "La solicitud ya no esta pendiente",
      CODIGO_ERROR.SOLICITUD_YA_RESUELTA,
    );
  }

  async solicitudDelColectivo(colectivoId, solicitudId) {
    const solicitud = await this.solicitudIngresoRepository.buscarPorId(solicitudId);
    if (!solicitud || !mismoId(solicitud.colectivoId, colectivoId)) {
      throw new NotFoundError("No existe esa solicitud en este colectivo");
    }
    return solicitud;
  }

  async cancelar(usuario, colectivoId, solicitudId) {
    const solicitud = await this.solicitudDelColectivo(colectivoId, solicitudId);
    if (!mismoId(solicitud.usuarioId, usuario._id)) {
      throw new NotFoundError("No existe esa solicitud en este colectivo");
    }
    const cancelada = await this.solicitudIngresoRepository.resolverSiPendiente(
      solicitud._id,
      {
        estado: ESTADO_SOLICITUD.CANCELADA,
        resueltaPor: usuario._id,
      },
    );
    if (!cancelada) throw this.yaResuelta();
    return cancelada;
  }

  async listarDeColectivo(colectivoId, { estado } = {}) {
    return this.conUsuarios(
      await this.solicitudIngresoRepository.listarDeColectivo(colectivoId, { estado }),
    );
  }

  async listarDeUsuario(usuario) {
    return this.solicitudIngresoRepository.listarDeUsuario(usuario._id);
  }

  async aceptar(contextoLider, colectivoId, solicitudId) {
    const solicitud = await this.solicitudDelColectivo(colectivoId, solicitudId);
    await this.colectivoActivo(colectivoId);

    return this.transacciones.ejecutar(async () => {
      await this.usuarioRepository.bloquear(solicitud.usuarioId);
      await this.contextoService.exigirSinModalidad(
        solicitud.usuarioId,
        TIPO_CONTEXTO.COLABORADOR,
      );
      const aceptada = await this.solicitudIngresoRepository.resolverSiPendiente(
        solicitud._id,
        { estado: ESTADO_SOLICITUD.ACEPTADA, resueltaPor: contextoLider.usuarioId },
      );
      if (!aceptada) throw this.yaResuelta();

      const contexto = await this.contextoUsuarioRepository.habilitarMembresia(
        solicitud.usuarioId,
        solicitud.colectivoId,
      );
      return {
        solicitud: aceptada,
        miembro: { contextoId: contexto.id, rol: contexto.rol },
      };
    });
  }

  async rechazar(contextoLider, colectivoId, solicitudId) {
    const solicitud = await this.solicitudDelColectivo(colectivoId, solicitudId);
    const rechazada = await this.solicitudIngresoRepository.resolverSiPendiente(
      solicitud._id,
      {
        estado: ESTADO_SOLICITUD.RECHAZADA,
        resueltaPor: contextoLider.usuarioId,
      },
    );
    if (!rechazada) throw this.yaResuelta();
    return rechazada;
  }

  async listarMiembros(colectivoId) {
    const contextos =
      await this.contextoUsuarioRepository.listarActivosDeColectivo(colectivoId);
    const usuarios = await this.usuarioRepository.buscarVarios(
      contextos.map((c) => c.usuarioId),
    );
    return contextos.map((contexto) => ({
      contextoId: contexto.id,
      usuarioId: String(contexto.usuarioId),
      nombre: usuarios.find((u) => mismoId(u._id, contexto.usuarioId))?.nombre ?? null,
      rol: contexto.rol,
      fechaAlta: contexto.fechaAlta,
    }));
  }

  async quitarMiembro(contextoLider, colectivoId, contextoId) {
    const miembro = await this.contextoUsuarioRepository.buscarPorId(contextoId);
    if (!miembro?.activo || !mismoId(miembro.colectivoId, colectivoId)) {
      throw new NotFoundError("No es miembro de este colectivo");
    }
    if (mismoId(miembro._id, contextoLider._id)) {
      throw new ConflictError("Para irte del colectivo usa la opcion de abandonarlo");
    }
    if (miembro.rol === ROL.LIDER) {
      throw new ConflictError("No se puede quitar al lider del colectivo");
    }
    await this.desactivar(miembro);
  }

  async abandonar(contexto, colectivoId) {
    if (contexto.rol === ROL.LIDER) {
      const otros = (
        await this.contextoUsuarioRepository.listarActivosDeColectivo(colectivoId)
      ).filter((c) => !mismoId(c._id, contexto._id));
      throw otros.length > 0
        ? new ConflictError(
            "Antes de irte, pasale el liderazgo a otro miembro",
            CODIGO_ERROR.LIDER_DEBE_TRANSFERIR,
          )
        : new ConflictError(
            "Sos el unico miembro: para irte, da de baja el colectivo",
            CODIGO_ERROR.LIDER_UNICO_MIEMBRO,
          );
    }
    await this.desactivar(contexto);
  }

  async darDeBajaColectivo(colectivoId, ahora = new Date()) {
    const colectivo = await this.colectivoService.darDeBaja(colectivoId, ahora);
    await this.transacciones.ejecutar(async () => {
      await this.solicitudIngresoRepository.cancelarPendientesDeColectivo(
        colectivo._id,
        ahora,
      );
      const desactivados =
        await this.contextoUsuarioRepository.desactivarActivosDeColectivo(
          colectivo._id,
          ahora,
        );
      await this.usuarioRepository.limpiarContextosActuales(desactivados);
    });
    return colectivo;
  }

  async desactivar(contexto) {
    await this.transacciones.ejecutar(async () => {
      const desactivado = await this.contextoUsuarioRepository.desactivarSi(
        contexto._id,
        {
          rol: ROL.MIEMBRO,
        },
      );
      if (!desactivado) {
        throw new ConflictError(
          "La membresia cambio mientras tanto. Volve a intentarlo.",
        );
      }
      await this.usuarioRepository.limpiarContextoActualSi(
        contexto.usuarioId,
        contexto._id,
      );
    });
  }
}
