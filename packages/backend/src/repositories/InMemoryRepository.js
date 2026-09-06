/**
 * Repositorio genérico en memoria. Cada repositorio concreto lo
 * extiende indicando cómo obtener el identificador de la entidad que
 * guarda (por defecto entity.id; HabilidadRepository usa el código).
 *
 * En la Segunda Entrega este archivo se reemplaza por acceso a
 * MongoDB. El resto de las capas depende de esta misma interfaz
 * (guardar / buscarPorId / listar / eliminar), así que no debería
 * necesitar cambios.
 */
export class InMemoryRepository {
  #entidades = new Map();

  obtenerId(entidad) {
    return entidad.id;
  }

  guardar(entidad) {
    this.#entidades.set(this.obtenerId(entidad), entidad);
    return entidad;
  }

  buscarPorId(id) {
    return this.#entidades.get(id) ?? null;
  }

  listar() {
    return [...this.#entidades.values()];
  }

  eliminar(id) {
    return this.#entidades.delete(id);
  }

  /**
   * Corta la lista según la página pedida. La fórmula del offset
   * vive acá, en el repositorio: es la capa que sabe cómo está
   * guardada la colección y cómo recortarla.
   */
  listarPaginado(numeroPagina, limitePorPagina) {
    const todos = this.listar();
    const inicio = (numeroPagina - 1) * limitePorPagina;
    const fin = inicio + limitePorPagina;

    return { items: todos.slice(inicio, fin), total: todos.length };
  }
}
