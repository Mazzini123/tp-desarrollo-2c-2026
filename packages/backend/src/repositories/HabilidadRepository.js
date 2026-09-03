import { InMemoryRepository } from "./InMemoryRepository.js";

export class HabilidadRepository extends InMemoryRepository {
  // Identidad por código, no por id: dos habilidades con el mismo
  // código son la misma habilidad (ver Habilidad.js).
  obtenerId(entidad) {
    return entidad.codigo;
  }

  existeCodigo(codigo) {
    return this.buscarPorId(codigo) !== null;
  }

  buscarPorCodigos(codigos) {
    return codigos.map((codigo) => this.buscarPorId(codigo)).filter(Boolean);
  }
}
