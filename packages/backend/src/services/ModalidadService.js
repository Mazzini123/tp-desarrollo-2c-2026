import { TIPO_CONTEXTO } from "../domain/enums/TIPO_CONTEXTO.js";
import { ROL } from "../domain/enums/ROL.js";
import { COLABORACION_ESTADO } from "../domain/enums/COLABORACION_ESTADO.js";
import { ConflictError } from "../errors/ConflictError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { CODIGO_ERROR } from "../errors/CODIGO_ERROR.js";
import { mismoId } from "../utils/ids.js";

const EN_CURSO = [COLABORACION_ESTADO.PENDIENTE, COLABORACION_ESTADO.ACEPTADA];

function motivoDeActividad(enCurso) {
  const pendientes = enCurso.filter(
    (c) => c.estado === COLABORACION_ESTADO.PENDIENTE,
  ).length;
  const aceptadas = enCurso.length - pendientes;
  const partes = [
    pendientes && `${pendientes} postulacion(es) pendiente(s)`,
    aceptadas && `${aceptadas} colaboracion(es) en curso`,
  ].filter(Boolean);
  return (
    `No se puede dar de baja el perfil: tiene ${partes.join(" y ")}. ` +
    "Retira las postulaciones y finaliza o desvinculate de las colaboraciones antes."
  );
}

export class ModalidadService {
  constructor({
    transacciones,
    contextoService,
    contextoUsuarioRepository,
    usuarioRepository,
    colectivoService,
    colaboradorService,
    colaboracionService,
  }) {
    this.transacciones = transacciones;
    this.colaboracionService = colaboracionService;
    this.contextoService = contextoService;
    this.contextoUsuarioRepository = contextoUsuarioRepository;
    this.usuarioRepository = usuarioRepository;
    this.colectivoService = colectivoService;
    this.colaboradorService = colaboradorService;
  }

  async crearPerfilColaborador(usuario, datos) {
    const colaborador = await this.transacciones.ejecutar(async () => {
      await this.usuarioRepository.bloquear(usuario._id);
      await this.contextoService.exigirSinModalidad(usuario._id, TIPO_CONTEXTO.COLECTIVO);
      const existente = await this.contextoUsuarioRepository.buscarColaboradorDeUsuario(
        usuario._id,
      );
      if (existente?.activo) {
        throw new ConflictError(
          "La cuenta ya tiene un perfil de colaboradora",
          CODIGO_ERROR.PERFIL_COLABORADOR_EXISTENTE,
        );
      }
      if (existente) {
        throw new ConflictError(
          "Tu perfil de colaboradora esta dado de baja: podes reactivarlo",
          CODIGO_ERROR.PERFIL_COLABORADOR_DADO_DE_BAJA,
          { colaboradorId: String(existente.colaboradorId) },
        );
      }

      const nuevo = await this.colaboradorService.crear(datos, { avisar: false });
      const contexto = await this.contextoUsuarioRepository.crear({
        usuarioId: usuario._id,
        tipo: TIPO_CONTEXTO.COLABORADOR,
        colaboradorId: nuevo._id,
        rol: ROL.COLABORADOR,
      });
      await this.usuarioRepository.fijarContextoActual(usuario._id, contexto._id);
      return nuevo;
    });

    await this.colaboradorService.avisarAlta(colaborador);
    return colaborador;
  }

  async darDeBajaPerfilColaborador(colaboradorId, ahora = new Date()) {
    const colaborador = await this.colaboradorService.buscarPorId(colaboradorId);
    this.colaboradorService.exigirActiva(colaborador);

    const enCurso = (
      await this.colaboracionService.listarPorColaborador(colaboradorId, {
        incluirAnonimas: true,
      })
    )
      .filter(({ colaboracion }) => EN_CURSO.includes(colaboracion.estado))
      .map(({ proyecto, colaboracion }) => ({
        proyectoId: proyecto.id,
        proyecto: proyecto.titulo,
        colaboracionId: colaboracion.id,
        estado: colaboracion.estado,
      }));
    if (enCurso.length > 0) {
      throw new ConflictError(
        motivoDeActividad(enCurso),
        CODIGO_ERROR.ACTIVIDAD_EN_CURSO,
        enCurso,
      );
    }

    return this.transacciones.ejecutar(async () => {
      const dadoDeBaja = await this.colaboradorService.darDeBaja(colaborador, ahora);
      const contexto = await this.contextoUsuarioRepository.buscarDeColaborador(
        colaborador._id,
      );
      if (contexto) {
        await this.contextoUsuarioRepository.desactivarSi(contexto._id, {}, ahora);
        await this.usuarioRepository.limpiarContextoActualSi(
          contexto.usuarioId,
          contexto._id,
        );
      }
      return dadoDeBaja;
    });
  }

  async reactivarPerfilColaborador(usuario, colaboradorId) {
    const contexto = await this.contextoUsuarioRepository.buscarColaboradorDeUsuario(
      usuario._id,
    );
    if (!contexto || !mismoId(contexto.colaboradorId, colaboradorId)) {
      throw new NotFoundError("No tenes un perfil de colaboradora con ese id");
    }
    if (contexto.activo) {
      throw new ConflictError("El perfil de colaboradora ya esta activo");
    }
    const colaborador = await this.colaboradorService.buscarPorId(String(colaboradorId));

    return this.transacciones.ejecutar(async () => {
      await this.usuarioRepository.bloquear(usuario._id);
      await this.contextoService.exigirSinModalidad(usuario._id, TIPO_CONTEXTO.COLECTIVO);
      const reactivado = await this.colaboradorService.reactivar(colaborador);
      await this.contextoUsuarioRepository.reactivar(contexto._id);
      await this.usuarioRepository.fijarContextoActual(usuario._id, contexto._id);
      return reactivado;
    });
  }

  async crearColectivo(usuario, datos) {
    return this.transacciones.ejecutar(async () => {
      await this.usuarioRepository.bloquear(usuario._id);
      await this.contextoService.exigirSinModalidad(
        usuario._id,
        TIPO_CONTEXTO.COLABORADOR,
      );

      const colectivo = await this.colectivoService.crear(datos);
      const contexto = await this.contextoUsuarioRepository.crear({
        usuarioId: usuario._id,
        tipo: TIPO_CONTEXTO.COLECTIVO,
        colectivoId: colectivo._id,
        rol: ROL.LIDER,
      });
      await this.usuarioRepository.fijarContextoActual(usuario._id, contexto._id);
      return colectivo;
    });
  }
}
