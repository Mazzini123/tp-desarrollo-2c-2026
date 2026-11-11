import { NotFoundError } from "../errors/NotFoundError.js";
import { ESTADO_ENVIO } from "../domain/enums/ESTADO_ENVIO.js";
import { armarPaginado } from "../utils/paginacion.js";
import { conLimiteDeTiempo } from "../utils/tiempo.js";
import { registro } from "../config/registro.js";

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

  async notificar(colaborador, { tipo, asunto, contenido, referencias = {}, clave }) {
    if (!colaborador.recibeMensajeriaInterna) {
      return null;
    }

    const envios = colaborador.mediosDeContacto
      .filter((medio) => this.canales[medio.tipo])
      .map((medio) => ({ canal: medio.tipo, destino: medio.valor }));

    return this.notificacionRepository.crear({
      clave,
      destinatarioId: colaborador.id,
      tipo,
      asunto,
      contenido,
      referencias,
      envios,
    });
  }

  async procesarEnviosPendientes(
    ahora = new Date(),
    { tope = 50, debeDetenerse = () => false } = {},
  ) {
    const resumen = { enviados: 0, reintentos: 0, fallidos: 0 };
    const inicio = Date.now();
    const instante = () => new Date(ahora.getTime() + Date.now() - inicio);

    for (let i = 0; i < tope && !debeDetenerse(); i++) {
      const momento = instante();
      const reservaHasta = new Date(momento.getTime() + this.politica.reservaMs);
      const tomado = await this.notificacionRepository.tomarEnvioPendiente(
        momento,
        reservaHasta,
      );
      if (!tomado) break;
      const estado = await this.enviar(tomado, instante);
      if (estado) resumen[estado] += 1;
    }

    return resumen;
  }

  async enviar({ notificacion, envio }, instante) {
    const intentos = envio.intentos + 1;
    try {
      const canal = this.canales[envio.canal];
      if (!canal) throw new Error(`No hay un canal configurado para ${envio.canal}`);
      const resultado = await conLimiteDeTiempo(
        canal.enviar({
          destino: envio.destino,
          asunto: notificacion.asunto,
          contenido: notificacion.contenido,
        }),
        this.politica.limiteDeTiempoMs,
        `El envio por ${envio.canal}`,
      );
      const confirmado = await this.notificacionRepository.actualizarEnvio(
        notificacion._id,
        envio._id,
        envio.reservaId,
        {
          estado: resultado?.simulado ? ESTADO_ENVIO.SIMULADO : ESTADO_ENVIO.ENVIADO,
          intentos,
          fechaEnvio: instante(),
          enProcesoHasta: null,
          reservaId: null,
          ultimoError: null,
        },
      );
      return confirmado ? "enviados" : null;
    } catch (error) {
      const agotado = intentos >= this.politica.maximoDeIntentos;
      const espera = this.politica.esperaInicialMs * 2 ** (intentos - 1);
      registro.error("envio_fallido", {
        notificacionId: notificacion.id,
        envioId: envio.id,
        canal: envio.canal,
        intentos,
        error: error.message,
      });
      const confirmado = await this.notificacionRepository.actualizarEnvio(
        notificacion._id,
        envio._id,
        envio.reservaId,
        {
          estado: agotado ? ESTADO_ENVIO.FALLIDO : ESTADO_ENVIO.PENDIENTE,
          intentos,
          proximoIntento: new Date(instante().getTime() + espera),
          enProcesoHasta: null,
          reservaId: null,
          ultimoError: error.message,
        },
      );
      return confirmado ? (agotado ? "fallidos" : "reintentos") : null;
    }
  }

  async listar(colaboradorId, { numeroPagina = 1, limitePorPagina = 10, leida } = {}) {
    if (!(await this.colaboradorRepository.buscarPorId(colaboradorId))) {
      throw new NotFoundError(`No existe un colaborador con id "${colaboradorId}"`);
    }

    const paginado = { numeroPagina, limitePorPagina };
    const pagina = armarPaginado(
      await this.notificacionRepository.listarPorDestinatarioPaginado(
        colaboradorId,
        paginado,
        { leida },
      ),
      paginado,
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
