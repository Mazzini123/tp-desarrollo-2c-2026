import { TIPO_CONTEXTO } from "../security/autorizacion/enums/TIPO_CONTEXTO.js";
import { ROL } from "../security/autorizacion/enums/ROL.js";
import { COLABORACION_ESTADO } from "../domain/enums/COLABORACION_ESTADO.js";
import { ConflictError } from "../errors/ConflictError.js";
import { CODIGO_ERROR } from "../errors/CODIGO_ERROR.js";

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
      const tienePerfilActivo = await this.contextoUsuarioRepository.existeActivoDeTipo(
        usuario._id,
        TIPO_CONTEXTO.COLABORADOR,
      );
      if (tienePerfilActivo) {
        throw new ConflictError(
          "La cuenta ya tiene un perfil de colaboradora activo",
          CODIGO_ERROR.PERFIL_COLABORADOR_EXISTENTE,
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
    return this.transacciones.ejecutar(async () => {
      const colaborador = await this.colaboradorService.buscarPorId(colaboradorId, {
        bloquear: true,
      });
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
