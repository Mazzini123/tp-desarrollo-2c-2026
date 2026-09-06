import { InMemoryRepository } from "./InMemoryRepository.js";

export class InMemoryHabilidadRepository extends InMemoryRepository {
  obtenerId(entidad) {
    return entidad.codigo;
  }

  existeCodigo(codigo) {
    return this.buscarPorId(codigo) !== null;
  }
}
