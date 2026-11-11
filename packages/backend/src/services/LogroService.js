import { NotFoundError } from "../errors/NotFoundError.js";
import { ConflictError } from "../errors/ConflictError.js";
import {
  buscarProyectoAbiertoOFallar,
  buscarProyectoOFallar,
} from "./soporte/buscarOFallar.js";

export class LogroService {
  constructor({ proyectoRepository }) {
    this.proyectoRepository = proyectoRepository;
  }

  async crear(proyectoId, datos) {
    const proyecto = await buscarProyectoAbiertoOFallar(
      this.proyectoRepository,
      proyectoId,
    );
    this.validarTituloUnico(proyecto, datos.titulo);
    const logro = proyecto.agregarLogro({
      titulo: datos.titulo,
      descripcion: datos.descripcion,
    });

    await this.proyectoRepository.guardar(proyecto);
    return logro;
  }

  async listar(proyectoId) {
    return (await buscarProyectoOFallar(this.proyectoRepository, proyectoId)).logros;
  }

  async buscarPorId(proyectoId, logroId) {
    const proyecto = await buscarProyectoOFallar(this.proyectoRepository, proyectoId);

    return this.buscarLogroOFallar(proyecto, logroId);
  }

  async actualizar(proyectoId, logroId, { titulo, descripcion }) {
    const proyecto = await buscarProyectoAbiertoOFallar(
      this.proyectoRepository,
      proyectoId,
    );
    const logro = this.buscarLogroOFallar(proyecto, logroId);
    this.validarTituloUnico(proyecto, titulo, logroId);
    logro.titulo = titulo;
    logro.descripcion = descripcion;

    await this.proyectoRepository.guardar(proyecto);
    return logro;
  }

  async eliminar(proyectoId, logroId) {
    const proyecto = await buscarProyectoAbiertoOFallar(
      this.proyectoRepository,
      proyectoId,
    );

    const logro = this.buscarLogroOFallar(proyecto, logroId);
    proyecto.quitarLogro(logro);

    await this.proyectoRepository.guardar(proyecto);
  }

  validarTituloUnico(proyecto, titulo, logroId = null) {
    const repetido = proyecto.logros.some(
      (l) => l.titulo.toLowerCase() === titulo.toLowerCase() && l.id !== logroId,
    );
    if (repetido) {
      throw new ConflictError(
        `El proyecto con id "${proyecto.id}" ya contiene un logro con mismo titulo`,
      );
    }
  }

  buscarLogroOFallar(proyecto, logroId) {
    const logro = proyecto.logros.find((l) => l.id === logroId);

    if (!logro) {
      throw new NotFoundError(
        `No existe un logro con id "${logroId}" en el proyecto con id "${proyecto.id}"`,
      );
    }

    return logro;
  }
}
