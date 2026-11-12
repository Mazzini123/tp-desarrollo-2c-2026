import { NotFoundError } from "../errors/NotFoundError.js";
import { DomainError } from "../errors/DomainError.js";
import {
  buscarProyectoAbiertoOFallar,
  buscarProyectoOFallar,
} from "./soporte/buscarOFallar.js";

export class AvanceService {
  constructor({ proyectoRepository }) {
    this.proyectoRepository = proyectoRepository;
  }

  async registrar(proyectoId, datos) {
    const proyecto = await buscarProyectoAbiertoOFallar(
      this.proyectoRepository,
      proyectoId,
    );
    this.validarPorcentajeMayor(proyecto, datos.porcentajeConcrecion);
    const avance = proyecto.agregarAvance({
      porcentajeConcrecion: datos.porcentajeConcrecion,
      urlSistema: datos.urlSistema,
      urlRepositorio: datos.urlRepositorio,
    });

    await this.proyectoRepository.guardar(proyecto);
    return avance;
  }

  validarPorcentajeMayor(proyecto, porcentajeConcrecion) {
    if (porcentajeConcrecion <= proyecto.porcentajeConcrecion) {
      throw new DomainError(
        `El porcentaje de concrecion a registrar debe ser mayor al porcentaje de concrecion que tiene el proyecto de id "${proyecto.id}"`,
      );
    }
  }

  async listar(proyectoId) {
    return (await buscarProyectoOFallar(this.proyectoRepository, proyectoId)).avances;
  }

  async buscarPorId(proyectoId, avanceId) {
    const proyecto = await buscarProyectoOFallar(this.proyectoRepository, proyectoId);

    return this.buscarAvanceOFallar(proyecto, avanceId);
  }

  buscarAvanceOFallar(proyecto, avanceId) {
    const avance = proyecto.avances.find((a) => a.id === avanceId);

    if (!avance) {
      throw new NotFoundError(
        `No existe avance con id "${avanceId}" en el proyecto con id "${proyecto.id}"`,
      );
    }

    return avance;
  }
}
