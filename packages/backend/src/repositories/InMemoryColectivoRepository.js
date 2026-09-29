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

  buscarPerfil(proyectoId, perfilId) {
    const proyectoConColectivo = this.buscarProyecto(proyectoId);

    if (!proyectoConColectivo) {
      return null;
    }

    const { colectivo, proyecto } = proyectoConColectivo;
    const perfil = proyecto.perfiles.find((p) => p.id === perfilId) ?? null;

    if (!perfil) {
      return null;
    }

    return { colectivo, proyecto, perfil };
  }

  listarPaginado(numeroPagina, limitePorPagina, { etiqueta } = {}) {
    const todos = this.listar().filter((c) => !etiqueta || c.etiquetas.includes(etiqueta));
    const inicio = (numeroPagina - 1) * limitePorPagina;

    return { items: todos.slice(inicio, inicio + limitePorPagina), total: todos.length };
  }

  listarProyectos() {
    return this.listar().flatMap((colectivo) => colectivo.proyectos);
  }

  listarProyectosPaginado(numeroPagina, limitePorPagina, { etiqueta } = {}) {
    const todos = this.listarProyectos().filter(
      (p) => !etiqueta || p.etiquetas.includes(etiqueta),
    );
    const inicio = (numeroPagina - 1) * limitePorPagina;

    return {
      items: todos.slice(inicio, inicio + limitePorPagina),
      total: todos.length,
    };
  }
}
