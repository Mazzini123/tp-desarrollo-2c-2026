import { InMemoryRepository } from "./InMemoryRepository.js";

export class InMemoryColaboradorRepository extends InMemoryRepository {
  // Las que tienen TODAS las habilidades pedidas.
  buscarPorHabilidades(codigos) {
    return this.listar().filter((colaborador) => {
      const propias = colaborador.habilidades.map((h) => h.codigo);
      return codigos.every((codigo) => propias.includes(codigo));
    });
  }
}
