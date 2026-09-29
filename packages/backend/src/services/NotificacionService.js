import { NotificacionInterna } from "../domain/NotificacionInterna.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { armarPaginado } from "../utils/paginacion.js";

export class NotificacionService {
  constructor({ notificacionRepository, colaboradorService, canales }) {
    this.notificacionRepository = notificacionRepository;
    this.colaboradorService = colaboradorService;
    // Un canal por tipo de medio de contacto: { EMAIL, WHATSAPP, SMS }.
    this.canales = canales;
  }

  // Devuelve null si la persona no acepta mensajeria interna: en ese caso no
  // se le escribe, ni adentro de la plataforma ni afuera.
  async notificar(colaborador, { tipo, asunto, contenido, referencias = {} }) {
    if (!colaborador.recibeMensajeriaInterna) {
      return null;
    }

    const notificacion = new NotificacionInterna({
      destinatarioId: colaborador.id,
      tipo,
      asunto,
      contenido,
      referencias,
    });

    notificacion.envios = await this.replicar(colaborador, notificacion);
    await this.notificacionRepository.guardar(notificacion);

    return notificacion;
  }

  // "Las notificaciones internas deberian poder ser replicadas a traves de los
  // medios de contacto registrados" — enunciado, segunda entrega.
  //
  // allSettled y no all: si falla el SMS igual tiene que salir el email, y un
  // proveedor caido no puede hacer fallar la operacion que genero el aviso.
  async replicar(colaborador, notificacion) {
    const medios = colaborador.mediosDeContacto.filter((medio) => this.canales[medio.tipo]);

    const resultados = await Promise.allSettled(
      medios.map((medio) =>
        this.canales[medio.tipo].enviar({
          destino: medio.valor,
          asunto: notificacion.asunto,
          contenido: notificacion.contenido,
        }),
      ),
    );

    return resultados.map((resultado, i) => {
      if (resultado.status === "rejected") {
        console.error(`No se pudo replicar por ${medios[i].tipo}:`, resultado.reason?.message);
      }
      return { canal: medios[i].tipo, exito: resultado.status === "fulfilled" };
    });
  }

  async listar(colaboradorId, { numeroPagina = 1, limitePorPagina = 10 } = {}) {
    await this.colaboradorService.buscarPorId(colaboradorId);

    return armarPaginado(
      await this.notificacionRepository.listarPorDestinatarioPaginado(
        colaboradorId,
        numeroPagina,
        limitePorPagina,
      ),
      numeroPagina,
      limitePorPagina,
    );
  }

  async marcarComoLeida(colaboradorId, notificacionId) {
    const notificacion = await this.notificacionRepository.buscarPorId(notificacionId);

    // Una notificacion ajena responde igual que una inexistente: no se confirma
    // que exista algo que no es tuyo.
    if (!notificacion || notificacion.destinatarioId !== colaboradorId) {
      throw new NotFoundError(`No existe la notificacion "${notificacionId}" para ese colaborador`);
    }

    notificacion.marcarComoLeida();
    return this.notificacionRepository.guardar(notificacion);
  }
}
