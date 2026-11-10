import { DomainError } from "../errors/DomainError.js";
import { ConflictError } from "../errors/ConflictError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { buscarProyectoOFallar } from "./soporte/buscarOFallar.js";

export class AvanceService {
  constructor({ proyectoRepository }) {
    this.proyectoRepository = proyectoRepository;
  }

  async registrarAvanceParaProyecto(proyectoId, datos) {
    const proyecto = await this.buscarProyectoAbierto(proyectoId);
    this.validarPorcentajeConcrecionParaProyecto(proyecto, datos.porcentajeConcrecion);

    const avance = proyecto.agregarAvance({
      porcentajeConcrecion: datos.porcentajeConcrecion,
      urlSistema: datos.urlSistema,
      urlRepositorio: datos.urlRepositorio,
    });

    await this.proyectoRepository.guardar(proyecto);
    return avance;
  }

  async listarParaProyecto(proyectoId) {
    return (await buscarProyectoOFallar(this.proyectoRepository, proyectoId)).avances;
  }

  async buscarPorIdParaProyecto(proyectoId, avanceId) {
    const proyecto = await buscarProyectoOFallar(this.proyectoRepository, proyectoId);

    return this.buscarAvanceDeProyectoOrThrow(proyecto, avanceId);
  }

  buscarAvanceDeProyectoOrThrow(proyecto, avanceId) {
    const avance = proyecto.avances.find((a) => a.id === avanceId);

    if (!avance) {
      throw new NotFoundError(
        `No existe avance con id "${avanceId}" en el proyecto con id "${proyecto.id}"`,
      );
    }

    return avance;
  }

  async buscarProyectoAbierto(proyectoId) {
    const proyecto = await buscarProyectoOFallar(this.proyectoRepository, proyectoId);
    if (!proyecto.estaAbierto()) {
      throw new ConflictError(
        `El proyecto con id "${proyectoId}" no se encuentra abierto`,
      );
    }
    return proyecto;
  }

  validarPorcentajeConcrecionParaProyecto(proyecto, porcentajeConcrecion) {
    if (proyecto.porcentajeConcrecion >= porcentajeConcrecion) {
      throw new DomainError(
        `El porcentaje de concrecion a registrar debe ser mayor al porcentaje de concrecion que tiene el proyecto de id "${proyecto.id}"`,
      );
    }
  }
}
