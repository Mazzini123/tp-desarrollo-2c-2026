export class InMemoryRepository {
  entidades = new Map();

  obtenerId(entidad) {
    return entidad.id;
  }

  guardar(entidad) {
    this.entidades.set(this.obtenerId(entidad), entidad);
    return entidad;
  }

  buscarPorId(id) {
    return this.entidades.get(id) ?? null;
  }

  listar() {
    return [...this.entidades.values()];
  }

  eliminar(id) {
    return this.entidades.delete(id);
  }

  listarPaginado(numeroPagina, limitePorPagina) {
    const todos = this.listar();
    const inicio = (numeroPagina - 1) * limitePorPagina;
    const fin = inicio + limitePorPagina;

    return { items: todos.slice(inicio, fin), total: todos.length };
  }
}
