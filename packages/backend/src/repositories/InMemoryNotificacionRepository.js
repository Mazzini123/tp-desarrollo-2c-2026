import { InMemoryRepository } from "./InMemoryRepository.js";

export class InMemoryNotificacionRepository extends InMemoryRepository {
  existeInvitacion(destinatarioId, perfilId) {
    return this.listar().some(
      (n) =>
        n.esPara(destinatarioId) &&
        n.tipo === "INVITACION" &&
        String(n.referencias?.perfilId) === String(perfilId),
    );
  }

  contarNoLeidas(destinatarioId) {
    return this.listar().filter((n) => n.esPara(destinatarioId) && !n.esLeida).length;
  }

  listarPorDestinatarioPaginado(destinatarioId, numeroPagina, limitePorPagina, { leida } = {}) {
    const todas = this.listar()
      .filter((n) => n.esPara(destinatarioId))
      .filter((n) => leida === undefined || Boolean(n.esLeida) === leida)
      .sort((a, b) => b.fecha - a.fecha);
    const inicio = (numeroPagina - 1) * limitePorPagina;

    return { items: todas.slice(inicio, inicio + limitePorPagina), total: todas.length };
  }
}
