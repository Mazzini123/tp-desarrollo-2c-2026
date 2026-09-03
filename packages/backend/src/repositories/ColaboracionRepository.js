import { InMemoryRepository } from "./InMemoryRepository.js";

export class ColaboracionRepository extends InMemoryRepository {
  buscarPorProyecto(proyectoId) {
    return this.listar().filter((c) => c.proyectoId === proyectoId);
  }

  buscarPorPersona(personaColaboradoraId) {
    return this.listar().filter((c) => c.personaColaboradoraId === personaColaboradoraId);
  }

  existeColaboracion(proyectoId, personaColaboradoraId) {
    return this.listar().some(
      (c) => c.proyectoId === proyectoId && c.personaColaboradoraId === personaColaboradoraId,
    );
  }
}
