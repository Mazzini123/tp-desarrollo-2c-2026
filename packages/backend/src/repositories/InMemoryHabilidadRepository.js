import { InMemoryRepository } from "./InMemoryRepository.js";

export class HabilidadRepository extends InMemoryRepository {
  // Identidad por código: dos habilidades con el mismo código son
  // la misma habilidad.
  obtenerId(entidad) {
    return entidad.codigo;
  }

  existeCodigo(codigo) {
    return this.buscarPorId(codigo) !== null;
  }
}
