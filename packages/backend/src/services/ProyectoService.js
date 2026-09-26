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

  crear({ colectivoId, titulo, descripcion, perfiles }) {
    if (!Array.isArray(perfiles) || perfiles.length === 0) {
      throw new DomainError("El proyecto debe tener al menos un perfil");
    }

    const colectivo = this.colectivoService.buscarPorId(colectivoId);
    const perfilesConstruidos = perfiles.map((datos) => this.perfilService.construirPerfil(datos));
    const proyecto = new Proyecto({ titulo, descripcion });

    perfilesConstruidos.forEach((perfil) => proyecto.agregarPerfil(perfil));
    colectivo.agregarProyecto(proyecto);
    this.colectivoRepository.guardar(colectivo);

    return proyecto;
  }

  listar({ numeroPagina = 1, limitePorPagina = 10 } = {}) {
    return armarPaginado(
      this.colectivoRepository.listarProyectosPaginado(numeroPagina, limitePorPagina),
      numeroPagina,
      limitePorPagina,
    );
  }

  listarPorColectivo(colectivoId) {
    return this.colectivoService.buscarPorId(colectivoId).proyectos;
  }

  buscarProyectoConColectivo(proyectoId) {
    const resultado = this.colectivoRepository.buscarProyecto(proyectoId);
    
    if (!resultado) {
      throw new NotFoundError(`No existe un proyecto con id "${proyectoId}"`);
    }

    return resultado;
  }

  buscarPorId(proyectoId) {
    return this.buscarProyectoConColectivo(proyectoId).proyecto;
  }

  verificarAbierto(proyecto, accion) {
    if (!proyecto.estaAbierto()) {
      throw new ConflictError(`No se puede ${accion} un proyecto finalizado`);
    }
  }

  actualizar(proyectoId, { titulo, descripcion }) {
    const { colectivo, proyecto } = this.buscarProyectoConColectivo(proyectoId);
    this.verificarAbierto(proyecto, "modificar");

    if (titulo !== undefined) {
      proyecto.titulo = titulo;
    }

    if (descripcion !== undefined) {
      proyecto.descripcion = descripcion;
    }

    this.colectivoRepository.guardar(colectivo);
    return proyecto;
  }

  finalizar(proyectoId) {
    const { colectivo, proyecto } = this.buscarProyectoConColectivo(proyectoId);
    this.verificarAbierto(proyecto, "finalizar");

    proyecto.finalizarProyecto();
    this.colectivoRepository.guardar(colectivo);
    return proyecto;
  }
}
