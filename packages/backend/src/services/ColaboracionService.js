import { Colaboracion } from "../domain/Colaboracion.js";
import { Colaborador } from "../domain/Colaborador.js";
import { DomainError } from "../errors/DomainError.js";
import { ConflictError } from "../errors/ConflictError.js";

export class ColaboracionService {
  constructor({ colectivoRepository, proyectoService, colaboradorService }) {
    this.colectivoRepository = colectivoRepository;
    this.proyectoService = proyectoService;
    this.colaboradorService = colaboradorService;
  }

  registrar({ proyectoId, colaboradorId }) {
    const { colectivo, proyecto } =
      this.proyectoService.buscarProyectoConColectivo(proyectoId);
    const colaborador = this.colaboradorService.buscarPorId(colaboradorId);

    if (!(colaborador instanceof Colaborador)) {
      throw new DomainError("Se esperaba una instancia de Colaborador");
    }

    if (!proyecto.estaAbierto()) {
      throw new ConflictError("No se puede anotar a un proyecto que ya está finalizado");
    }

    if (!proyecto.cumpleAlgunaHabilidadRequerida(colaborador)) {
      throw new DomainError(
        "El colaborador debe tener al menos una de las habilidades que necesita el proyecto",
      );
    }

    if (this.yaEstaAnotado(colaborador, proyecto)) {
      throw new ConflictError("El colaborador ya está anotado en este proyecto");
    }

    const colaboracion = new Colaboracion({ colaborador });
    proyecto.agregarColaboracion(colaboracion);
    this.colectivoRepository.guardar(colectivo);

    return colaboracion;
  }

  yaEstaAnotado(colaborador, proyecto) {
    return proyecto.yaColaboraron(colaborador);
  }

  listarPorProyecto(proyectoId) {
    return this.proyectoService.buscarPorId(proyectoId).colaboraciones;
  }

  listarPorColaborador(colaboradorId) {
    const colaborador = this.colaboradorService.buscarPorId(colaboradorId);

    return this.colectivoRepository.listarProyectos().flatMap((proyecto) =>
      proyecto.colaboraciones
        .filter((c) => c.colaborador.id === colaborador.id)
        .map((c) => ({ proyectoId: proyecto.id, colaboracion: c })),
    );
  }
}
