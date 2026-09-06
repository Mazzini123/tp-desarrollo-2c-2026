import { Proyecto } from "../domain/Proyecto.js";
import { Compromiso } from "../domain/Compromiso.js";
import { ModalidadColaboracion } from "../domain/ModalidadColaboracion.js";
import { NotFoundError, ConflictError } from "../errors/index.js";
import { armarPaginado } from "./paginacion.js";

/**
 * Casos de uso sobre Proyecto.
 *
 * Como Proyecto vive dentro de Colectivo, crear un proyecto es
 * agregarlo a su colectivo y guardar el colectivo entero. Buscar un
 * proyecto implica recorrer los colectivos: eso lo encapsula
 * ColectivoRepository.buscarProyecto.
 */
export class ProyectoService {
  constructor({ colectivoRepository, colectivoService, habilidadService }) {
    this.colectivoRepository = colectivoRepository;
    this.colectivoService = colectivoService;
    this.habilidadService = habilidadService;
  }

  crear({
    colectivoId,
    titulo,
    descripcion,
    compromisoEsperado,
    modalidadColaboracion,
    habilidadesNecesarias,
  }) {
    const colectivo = this.colectivoService.buscarPorId(colectivoId);
    const habilidades = this.habilidadService.resolverPorCodigos(habilidadesNecesarias);

    const proyecto = new Proyecto({
      titulo,
      descripcion,
      compromisoEsperado: new Compromiso(compromisoEsperado),
      modalidadColaboracion: new ModalidadColaboracion(modalidadColaboracion),
      habilidadesNecesarias: habilidades,
    });

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

  /**
   * Devuelve { colectivo, proyecto }. Es el único buscador: el
   * colectivo contenedor hace falta para persistir cualquier cambio
   * sobre el proyecto, así que devolver sólo el proyecto llevaba a
   * tener dos métodos casi idénticos.
   */
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

  /**
   * Un proyecto finalizado es historia: no se le cambian los datos ni
   * las habilidades que pedía, porque las colaboraciones que ya
   * ocurrieron se registraron bajo esas condiciones.
   */
  verificarAbierto(proyecto, accion) {
    if (!proyecto.estaAbierto()) {
      throw new ConflictError(`No se puede ${accion} un proyecto finalizado`);
    }
  }

  actualizar(proyectoId, { titulo, descripcion }) {
    const { colectivo, proyecto } = this.buscarProyectoConColectivo(proyectoId);
    this.verificarAbierto(proyecto, "modificar");

    proyecto.actualizarDatos({ titulo, descripcion });
    this.colectivoRepository.guardar(colectivo);
    return proyecto;
  }

  agregarHabilidadRequerida(proyectoId, codigoHabilidad) {
    const { colectivo, proyecto } = this.buscarProyectoConColectivo(proyectoId);
    this.verificarAbierto(proyecto, "agregar habilidades a");

    const [habilidad] = this.habilidadService.resolverPorCodigos([codigoHabilidad]);
    proyecto.agregarHabilidadRequerida(habilidad);
    this.colectivoRepository.guardar(colectivo);
    return proyecto;
  }

  quitarHabilidadRequerida(proyectoId, codigoHabilidad) {
    const { colectivo, proyecto } = this.buscarProyectoConColectivo(proyectoId);
    this.verificarAbierto(proyecto, "quitar habilidades de");

    const [habilidad] = this.habilidadService.resolverPorCodigos([codigoHabilidad]);
    proyecto.quitarHabilidadRequerida(habilidad);
    this.colectivoRepository.guardar(colectivo);
    return proyecto;
  }

  finalizar(proyectoId) {
    const { colectivo, proyecto } = this.buscarProyectoConColectivo(proyectoId);
    proyecto.finalizarProyecto();
    this.colectivoRepository.guardar(colectivo);
    return proyecto;
  }
}
