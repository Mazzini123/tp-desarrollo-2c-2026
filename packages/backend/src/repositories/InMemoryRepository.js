/**
 * Repositorio genérico en memoria. Cada repositorio concreto lo
 * extiende indicando cómo obtener el identificador de la entidad que
 * guarda (por defecto, entity.id; HabilidadRepository lo pisa para
 * usar el código).
 *
 * En la Segunda Entrega este archivo se reemplaza por acceso a
 * MongoDB: el resto de las capas (services, controllers) no debería
 * tener que cambiar, porque dependen de esta misma interfaz
 * (guardar / buscarPorId / listar / eliminar).
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
}
