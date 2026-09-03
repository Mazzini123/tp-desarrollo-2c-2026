import { Colaboracion } from "../domain/Colaboracion.js";
import { DomainError } from "../domain/DomainError.js";

/**
 * El caso de uso central del requerimiento 2b: anotar una persona
 * colaboradora a un proyecto. Reúne tres reglas que ninguna entidad
 * puede validar por sí sola porque necesitan mirar a las otras:
 *
 *  1. El proyecto debe estar ABIERTO.
 *  2. La persona debe tener al menos una de las habilidades
 *     requeridas por el proyecto.
 *  3. La persona no puede estar ya anotada en ese proyecto (si lo
 *     intenta, se rompe explícitamente: así lo pidió la cátedra,
 *     para que la UI decida cómo reaccionar).
 */
export class ColaboracionService {
  #colaboracionRepository;
  #proyectoService;
  #personaColaboradoraService;

  constructor({ colaboracionRepository, proyectoService, personaColaboradoraService }) {
    this.#colaboracionRepository = colaboracionRepository;
    this.#proyectoService = proyectoService;
    this.#personaColaboradoraService = personaColaboradoraService;
  }

  registrar({ proyectoId, personaColaboradoraId }) {
    const proyecto = this.#proyectoService.buscarPorId(proyectoId);
    const persona = this.#personaColaboradoraService.buscarPorId(personaColaboradoraId);

    if (!proyecto.estaAbierto()) {
      throw new DomainError("No se puede anotar a un proyecto que ya está finalizado");
    }

    const cumpleAlgunaHabilidad = persona.habilidades.some((h) => proyecto.requiereHabilidad(h));
    if (!cumpleAlgunaHabilidad) {
      throw new DomainError(
        "La persona debe tener al menos una de las habilidades requeridas por el proyecto",
      );
    }

    if (this.#colaboracionRepository.existeColaboracion(proyectoId, personaColaboradoraId)) {
      throw new DomainError("La persona ya está anotada en este proyecto");
    }

    const colaboracion = new Colaboracion({ proyectoId, personaColaboradoraId });
    return this.#colaboracionRepository.guardar(colaboracion);
  }

  listarPorProyecto(proyectoId) {
    // Lanza NotFoundError si el proyecto no existe.
    this.#proyectoService.buscarPorId(proyectoId);
    return this.#colaboracionRepository.buscarPorProyecto(proyectoId);
  }

  listarPorPersona(personaColaboradoraId) {
    this.#personaColaboradoraService.buscarPorId(personaColaboradoraId);
    return this.#colaboracionRepository.buscarPorPersona(personaColaboradoraId);
  }
}
