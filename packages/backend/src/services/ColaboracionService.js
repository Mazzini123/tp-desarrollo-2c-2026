import { Colaboracion } from "../domain/Colaboracion.js";
import { DomainError, ConflictError } from "../errors/index.js";

/**
 * Requerimiento 2b: anotar un colaborador a un proyecto.
 *
 * Reúne tres reglas que ninguna entidad puede validar sola porque
 * necesitan mirar a las otras:
 *
 *  1. El proyecto debe estar ABIERTO.
 *  2. El colaborador debe tener al menos una de las habilidades que
 *     el proyecto necesita.
 *  3. No puede estar ya anotado en ese proyecto (si lo intenta, se
 *     rompe explícitamente: así lo pidió la cátedra, para que la UI
 *     pueda reaccionar).
 *
 * Como la Colaboracion vive dentro del Proyecto, y el Proyecto
 * dentro del Colectivo, al final se persiste el colectivo entero.
 */
export class ColaboracionService {
  #colectivoRepository;
  #proyectoService;
  #colaboradorService;

  constructor({ colectivoRepository, proyectoService, colaboradorService }) {
    this.#colectivoRepository = colectivoRepository;
    this.#proyectoService = proyectoService;
    this.#colaboradorService = colaboradorService;
  }

  registrar({ proyectoId, colaboradorId }) {
    const { colectivo, proyecto } = this.#proyectoService.buscarConColectivo(proyectoId);
    const colaborador = this.#colaboradorService.buscarPorId(colaboradorId);

    if (!proyecto.estaAbierto()) {
      throw new ConflictError("No se puede anotar a un proyecto que ya está finalizado");
    }

    if (!proyecto.cumpleHabilidadesRequeridas(colaborador)) {
      throw new DomainError(
        "El colaborador debe tener al menos una de las habilidades que necesita el proyecto",
      );
    }

    if (proyecto.yaColaboraron(colaborador)) {
      throw new ConflictError("El colaborador ya está anotado en este proyecto");
    }

    const colaboracion = new Colaboracion({ colaborador });
    proyecto.agregarColaboracion(colaboracion);
    this.#colectivoRepository.guardar(colectivo);

    return colaboracion;
  }

  listarPorProyecto(proyectoId) {
    return this.#proyectoService.buscarPorId(proyectoId).colaboraciones;
  }

  /**
   * Historial de un colaborador en la plataforma. Como las
   * colaboraciones viven dentro de los proyectos, hay que recorrer
   * todos los colectivos y sus proyectos.
   */
  listarPorColaborador(colaboradorId) {
    const colaborador = this.#colaboradorService.buscarPorId(colaboradorId);

    return this.#colectivoRepository.listarProyectos().flatMap((proyecto) =>
      proyecto.colaboraciones
        .filter((c) => c.colaborador.id === colaborador.id)
        .map((c) => ({ proyectoId: proyecto.id, colaboracion: c })),
    );
  }
}
