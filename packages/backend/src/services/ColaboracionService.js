import { Colaboracion } from "../domain/Colaboracion.js";
import { DomainError } from "../errors/DomainError.js";
import { ConflictError } from "../errors/ConflictError.js";

export class ColaboracionService {
  constructor({ colectivoRepository, proyectoService, colaboradorService }) {
    this.colectivoRepository = colectivoRepository;
    this.proyectoService = proyectoService;
    this.colaboradorService = colaboradorService;
  }

  async registrar({ proyectoId, colaboradorId }) {
    const { colectivo, proyecto } = await this.proyectoService.buscarProyectoConColectivo(proyectoId);
    const colaborador = await this.colaboradorService.buscarPorId(colaboradorId);

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
    await this.colectivoRepository.guardar(colectivo);

    return colaboracion;
  }

  yaEstaAnotado(colaborador, proyecto) {
    return proyecto.yaColaboraron(colaborador);
  }

  async listarPorProyecto(proyectoId) {
    return (await this.proyectoService.buscarPorId(proyectoId)).colaboraciones;
  }

  async listarPorColaborador(colaboradorId) {
    const colaborador = await this.colaboradorService.buscarPorId(colaboradorId);
    const proyectos = await this.colectivoRepository.listarProyectos();

    return proyectos.flatMap((proyecto) =>
      proyecto.colaboraciones
        .filter((c) => c.colaborador.id === colaborador.id)
        .map((c) => ({ proyectoId: proyecto.id, colaboracion: c })),
    );
  }
}
