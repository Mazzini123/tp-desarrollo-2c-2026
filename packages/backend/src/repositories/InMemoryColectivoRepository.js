import { InMemoryRepository } from "./InMemoryRepository.js";

export class InMemoryColectivoRepository extends InMemoryRepository {
  buscarProyecto(proyectoId) {
    for (const colectivo of this.listar()) {
      const proyecto = colectivo.buscarProyecto(proyectoId);
      if (proyecto) {
        return { colectivo, proyecto };
      }
    }
    return null;
  }

  registrarVisualizacion(proyectoId) {
    const resultado = this.buscarProyecto(proyectoId);
    if (resultado) {
      resultado.proyecto.visualizaciones += 1;
    }
  }

  buscarPerfil(proyectoId, perfilId) {
    const proyectoConColectivo = this.buscarProyecto(proyectoId);

    if (!proyectoConColectivo) {
      return null;
    }

    const { colectivo, proyecto } = proyectoConColectivo;
    const perfil = proyecto.buscarPerfil(perfilId);

    if (!perfil) {
      return null;
    }

    return { colectivo, proyecto, perfil };
  }

  listarPaginado(numeroPagina, limitePorPagina, { etiqueta } = {}) {
    const todos = this.listar().filter(
      (c) => !etiqueta || c.etiquetas.includes(etiqueta),
    );
    const inicio = (numeroPagina - 1) * limitePorPagina;

    return { items: todos.slice(inicio, inicio + limitePorPagina), total: todos.length };
  }

  buscarConCierreVencido(ahora) {
    return this.listar().filter((c) => c.proyectos.some((p) => p.cierreVencido(ahora)));
  }

  buscarColectivosDeColaborador(colaboradorId) {
    return this.listar().filter((colectivo) =>
      colectivo.proyectos.some((p) =>
        p.colaboraciones.some((c) => c.esDe(colaboradorId)),
      ),
    );
  }

  listarProyectos() {
    return this.listar().flatMap((colectivo) => colectivo.proyectos);
  }

  // La version de referencia de la regla: usa los metodos de dominio. La de
  // Mongo es la misma regla escrita como consulta (y el test de integracion
  // chequea que coincidan).
  buscarProyectosCompatibles(colaborador, numeroPagina, limitePorPagina) {
    const todos = this.listarProyectos().filter(
      (proyecto) =>
        proyecto.aceptaPostulaciones() &&
        proyecto.cumpleAlgunPerfil(colaborador) &&
        !proyecto.yaColaboraron(colaborador),
    );
    const inicio = (numeroPagina - 1) * limitePorPagina;

    return { items: todos.slice(inicio, inicio + limitePorPagina), total: todos.length };
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
