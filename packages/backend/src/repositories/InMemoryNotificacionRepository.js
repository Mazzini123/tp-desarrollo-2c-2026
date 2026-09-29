import { InMemoryRepository } from "./InMemoryRepository.js";

export class InMemoryNotificacionRepository extends InMemoryRepository {
  listarPorDestinatarioPaginado(destinatarioId, numeroPagina, limitePorPagina) {
    const todas = this.listar()
      .filter((n) => n.destinatarioId === destinatarioId)
      .sort((a, b) => b.fecha - a.fecha);
    const inicio = (numeroPagina - 1) * limitePorPagina;

    return { items: todas.slice(inicio, inicio + limitePorPagina), total: todas.length };
  }
}
