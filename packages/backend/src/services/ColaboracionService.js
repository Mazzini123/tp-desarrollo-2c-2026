import { Colaboracion } from "../domain/Colaboracion.js";
import { DomainError } from "../errors/DomainError.js";
import { ConflictError } from "../errors/ConflictError.js";

export class ColaboracionService {
  constructor({ colectivoRepository, proyectoService, colaboradorService }) {
    this.colectivoRepository = colectivoRepository;
    this.proyectoService = proyectoService;
    this.colaboradorService = colaboradorService;
  }

  registrar({ proyectoId, colaboradorId }) {
    const { colectivo, proyecto } = this.proyectoService.buscarProyectoConColectivo(proyectoId);
    const colaborador = this.colaboradorService.buscarPorId(colaboradorId);

    if (!proyecto.estaAbierto()) {
      throw new ConflictError("No se puede anotar a un proyecto que ya está finalizado");
    }

    if (!proyecto.cumpleAlgunPerfil(colaborador)) {
      throw new DomainError("El colaborador debe cumplir todas las habilidades requeridas de al menos un perfil");
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
