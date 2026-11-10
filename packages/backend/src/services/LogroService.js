import { ConflictError } from "../errors/ConflictError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { buscarProyectoOFallar } from "./soporte/buscarOFallar.js";

export class LogroService {
  constructor({ proyectoRepository }) {
    this.proyectoRepository = proyectoRepository;
  }

  async crearParaProyecto(proyectoId, datos) {
    const proyecto = await this.buscarProyectoAbierto(proyectoId);
    this.validarTituloLogroParaProyecto(datos.titulo, proyecto);

    const logro = proyecto.agregarLogro({
      titulo: datos.titulo,
      descripcion: datos.descripcion,
    });

    await this.proyectoRepository.guardar(proyecto);
    return logro;
  }

  async conseguirTodosDeProyecto(proyectoId) {
    return (await buscarProyectoOFallar(this.proyectoRepository, proyectoId)).logros;
  }

  async conseguirPorIdParaProyecto(proyectoId, logroId) {
    const proyecto = await buscarProyectoOFallar(this.proyectoRepository, proyectoId);

    return this.buscarLogroDeProyectoOrThrow(proyecto, logroId);
  }

  async actualizarParaProyecto(proyectoId, logroId, { titulo, descripcion }) {
    const proyecto = await this.buscarProyectoAbierto(proyectoId);
    this.validarTituloLogroParaProyecto(titulo, proyecto, logroId);

    const logro = this.buscarLogroDeProyectoOrThrow(proyecto, logroId);

    logro.titulo = titulo;
    logro.descripcion = descripcion;

    await this.proyectoRepository.guardar(proyecto);
    return logro;
  }

  validarTituloLogroParaProyecto(tituloLogro, proyecto, logroId = null) {
    if (
      proyecto.logros.some(
        (l) => l.titulo.toLowerCase() === tituloLogro.toLowerCase() && l.id !== logroId,
      )
    ) {
      throw new ConflictError(
        `El proyecto con id "${proyecto.id}" ya contiene un logro con mismo titulo`,
      );
    }
  }

  async eliminarParaProyecto(proyectoId, logroId) {
    const proyecto = await this.buscarProyectoAbierto(proyectoId);

    const logro = this.buscarLogroDeProyectoOrThrow(proyecto, logroId);
    proyecto.logros = proyecto.logros.filter((l) => l.id !== logro.id);

    await this.proyectoRepository.guardar(proyecto);
  }

  buscarLogroDeProyectoOrThrow(proyecto, logroId) {
    const logro = proyecto.logros.find((l) => l.id === logroId);

    if (!logro) {
      throw new NotFoundError(
        `No existe un logro con id "${logroId}" en el proyecto con id "${proyecto.id}"`,
      );
    }

    return logro;
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
}
