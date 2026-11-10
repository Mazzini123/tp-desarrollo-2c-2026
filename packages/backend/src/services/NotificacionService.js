import { NotFoundError } from "../errors/NotFoundError.js";
import { ESTADO_ENVIO } from "../domain/enums/ESTADO_ENVIO.js";
import { armarPaginado } from "../utils/paginacion.js";
import { conLimiteDeTiempo } from "../utils/tiempo.js";

const UN_MINUTO = 60_000;

export const POLITICA_DE_ENVIOS = Object.freeze({
  maximoDeIntentos: 5,
  esperaInicialMs: UN_MINUTO,
  limiteDeTiempoMs: 10_000,
  reservaMs: 5 * UN_MINUTO,
});

export class NotificacionService {
  constructor({
    notificacionRepository,
    colaboradorRepository,
    canales,
    politica = POLITICA_DE_ENVIOS,
  }) {
    this.notificacionRepository = notificacionRepository;
    this.colaboradorRepository = colaboradorRepository;
    this.canales = canales;
    this.politica = politica;
  }

  async notificar(colaborador, { tipo, asunto, contenido, referencias = {} }) {
    if (!colaborador.recibeMensajeriaInterna) {
      return null;
    }

    const envios = colaborador.mediosDeContacto
      .filter((medio) => this.canales[medio.tipo])
      .map((medio) => ({ canal: medio.tipo, destino: medio.valor }));

    return this.notificacionRepository.crear({
      destinatarioId: colaborador.id,
      tipo,
      asunto,
      contenido,
      referencias,
      envios,
    });
  }

  async procesarEnviosPendientes(ahora = new Date(), { tope = 50 } = {}) {
    const resumen = { enviados: 0, reintentos: 0, fallidos: 0 };
    const reservaHasta = new Date(ahora.getTime() + this.politica.reservaMs);

    for (let i = 0; i < tope; i++) {
      const tomado = await this.notificacionRepository.tomarEnvioPendiente(
        ahora,
        reservaHasta,
      );
      if (!tomado) break;
      resumen[await this.enviar(tomado, ahora)] += 1;
    }

    return resumen;
  }

  async enviar({ notificacion, envio }, ahora) {
    const intentos = envio.intentos + 1;
    try {
      const canal = this.canales[envio.canal];
      if (!canal) throw new Error(`No hay un canal configurado para ${envio.canal}`);
      await conLimiteDeTiempo(
        canal.enviar({
          destino: envio.destino,
          asunto: notificacion.asunto,
          contenido: notificacion.contenido,
        }),
        this.politica.limiteDeTiempoMs,
        `El envio por ${envio.canal}`,
      );
      await this.notificacionRepository.actualizarEnvio(notificacion._id, envio._id, {
        estado: ESTADO_ENVIO.ENVIADO,
        intentos,
        fechaEnvio: ahora,
        enProcesoHasta: null,
        ultimoError: null,
      });
      return "enviados";
    } catch (error) {
      const agotado = intentos >= this.politica.maximoDeIntentos;
      const espera = this.politica.esperaInicialMs * 2 ** (intentos - 1);
      console.error(
        `No se pudo enviar por ${envio.canal} (intento ${intentos}):`,
        error.message,
      );
      await this.notificacionRepository.actualizarEnvio(notificacion._id, envio._id, {
        estado: agotado ? ESTADO_ENVIO.FALLIDO : ESTADO_ENVIO.PENDIENTE,
        intentos,
        proximoIntento: new Date(ahora.getTime() + espera),
        enProcesoHasta: null,
        ultimoError: error.message,
      });
      return agotado ? "fallidos" : "reintentos";
    }
  }

  async listar(colaboradorId, { numeroPagina = 1, limitePorPagina = 10, leida } = {}) {
    if (!(await this.colaboradorRepository.buscarPorId(colaboradorId))) {
      throw new NotFoundError(`No existe un colaborador con id "${colaboradorId}"`);
    }

    const pagina = armarPaginado(
      await this.notificacionRepository.listarPorDestinatarioPaginado(
        colaboradorId,
        numeroPagina,
        limitePorPagina,
        { leida },
      ),
      numeroPagina,
      limitePorPagina,
    );
    const noLeidas = await this.notificacionRepository.contarNoLeidas(colaboradorId);

    return { ...pagina, noLeidas };
  }

  async yaInvitada(colaboradorId, perfilId) {
    return this.notificacionRepository.existeInvitacion(colaboradorId, perfilId);
  }

  async marcarComoLeida(colaboradorId, notificacionId) {
    const notificacion = await this.notificacionRepository.buscarPorId(notificacionId);

    if (!notificacion || !notificacion.esPara(colaboradorId)) {
      throw new NotFoundError(
        `No existe la notificacion "${notificacionId}" para ese colaborador`,
      );
    }

    notificacion.marcarComoLeida();
    return this.notificacionRepository.guardar(notificacion);
  }
}
