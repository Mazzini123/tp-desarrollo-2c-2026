import { InMemoryRepository } from "./InMemoryRepository.js";

/**
 * Raíz del agregado Colectivo -> Proyecto -> Colaboracion.
 * Los proyectos no tienen repositorio propio: se los alcanza
 * navegando desde el colectivo que los contiene.
 */
export class ColectivoRepository extends InMemoryRepository {
  /**
   * Devuelve { colectivo, proyecto } o null. Recorre los colectivos
   * porque, al ser Proyecto parte del agregado, no hay un índice
   * directo por id de proyecto.
   */
  buscarProyecto(proyectoId) {
    for (const colectivo of this.listar()) {
      const proyecto = colectivo.buscarProyecto(proyectoId);
      if (proyecto) {
        return { colectivo, proyecto };
      }
    }
    return null;
  }

  listarProyectos() {
    return this.listar().flatMap((colectivo) => colectivo.proyectos);
  }
}
