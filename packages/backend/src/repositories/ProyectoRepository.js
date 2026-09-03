import { InMemoryRepository } from "./InMemoryRepository.js";

export class ProyectoRepository extends InMemoryRepository {
  buscarPorColectivo(colectivoId) {
    return this.listar().filter((proyecto) => proyecto.colectivoId === colectivoId);
  }
}
