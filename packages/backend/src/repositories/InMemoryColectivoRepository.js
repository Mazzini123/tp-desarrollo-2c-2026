import { InMemoryRepository } from "./InMemoryRepository.js";

export class InMemoryColectivoRepository extends InMemoryRepository {
  buscarProyecto(proyectoId) {
    for (const colectivo of this.listar()) {
      const proyecto = colectivo.proyectos.find((p) => p.id === proyectoId) ?? null;
      if (proyecto) {
        return { colectivo, proyecto };
      }
    }
    return null;
  }

  listarProyectos() {
    return this.listar().flatMap((colectivo) => colectivo.proyectos);
  }

  listarProyectosPaginado(numeroPagina, limitePorPagina) {
    const todos = this.listarProyectos();
    const inicio = (numeroPagina - 1) * limitePorPagina;

    return {
      items: todos.slice(inicio, inicio + limitePorPagina),
      total: todos.length,
    };
  }
}
