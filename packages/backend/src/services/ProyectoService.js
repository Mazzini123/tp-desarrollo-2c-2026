import { Proyecto } from "../domain/Proyecto.js";
import { DomainError } from "../errors/DomainError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { ConflictError } from "../errors/ConflictError.js";
import { armarPaginado } from "../utils/paginacion.js";

export class ProyectoService {
  constructor({ colectivoRepository, colectivoService, perfilService }) {
    this.colectivoRepository = colectivoRepository;
    this.colectivoService = colectivoService;
    this.perfilService = perfilService;
  }

  async crear({ colectivoId, titulo, descripcion, perfiles }) {
    if (!Array.isArray(perfiles) || perfiles.length === 0) {
      throw new DomainError("El proyecto debe tener al menos un perfil");
    }

    const colectivo = await this.colectivoService.buscarPorId(colectivoId);
    // construirPerfil es async (resuelve habilidades): Promise.all espera a todos.
    const perfilesConstruidos = await Promise.all(
      perfiles.map((datos) => this.perfilService.construirPerfil(datos)),
    );
    const proyecto = new Proyecto({ titulo, descripcion });

    perfilesConstruidos.forEach((perfil) => proyecto.agregarPerfil(perfil));
    colectivo.agregarProyecto(proyecto);
    await this.colectivoRepository.guardar(colectivo);

    return proyecto;
  }

  async listar({ numeroPagina = 1, limitePorPagina = 10 } = {}) {
    return armarPaginado(
      await this.colectivoRepository.listarProyectosPaginado(numeroPagina, limitePorPagina),
      numeroPagina,
      limitePorPagina,
    );
  }

  async listarPorColectivo(colectivoId) {
    return (await this.colectivoService.buscarPorId(colectivoId)).proyectos;
  }

  async buscarProyectoConColectivo(proyectoId) {
    const resultado = await this.colectivoRepository.buscarProyecto(proyectoId);

    if (!resultado) {
      throw new NotFoundError(`No existe un proyecto con id "${proyectoId}"`);
    }

    return resultado;
  }

  async buscarPorId(proyectoId) {
    return (await this.buscarProyectoConColectivo(proyectoId)).proyecto;
  }

  verificarAbierto(proyecto, accion) {
    if (!proyecto.estaAbierto()) {
      throw new ConflictError(`No se puede ${accion} un proyecto finalizado`);
    }
  }

  async actualizar(proyectoId, { titulo, descripcion }) {
    const { colectivo, proyecto } = await this.buscarProyectoConColectivo(proyectoId);
    this.verificarAbierto(proyecto, "modificar");

    if (titulo !== undefined) {
      proyecto.titulo = titulo;
    }

    if (descripcion !== undefined) {
      proyecto.descripcion = descripcion;
    }

    await this.colectivoRepository.guardar(colectivo);
    return proyecto;
  }

  async finalizar(proyectoId) {
    const { colectivo, proyecto } = await this.buscarProyectoConColectivo(proyectoId);
    this.verificarAbierto(proyecto, "finalizar");

    proyecto.finalizarProyecto();
    await this.colectivoRepository.guardar(colectivo);
    return proyecto;
  }
}
