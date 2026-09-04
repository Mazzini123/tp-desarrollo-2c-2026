import { Proyecto } from "../domain/Proyecto.js";
import { Compromiso } from "../domain/Compromiso.js";
import { ModalidadColaboracion } from "../domain/ModalidadColaboracion.js";
import { NotFoundError } from "../errors/NotFoundError.js";

/**
 * Casos de uso sobre Proyecto.
 *
 * Como Proyecto vive dentro de Colectivo, crear un proyecto es en
 * realidad agregarlo a su colectivo, y guardar el colectivo entero.
 * Buscar un proyecto implica recorrer los colectivos: eso lo
 * encapsula ColectivoRepository.buscarProyecto.
 */
export class ProyectoService {
  #colectivoRepository;
  #colectivoService;
  #habilidadService;

  constructor({ colectivoRepository, colectivoService, habilidadService }) {
    this.#colectivoRepository = colectivoRepository;
    this.#colectivoService = colectivoService;
    this.#habilidadService = habilidadService;
  }

  crear({
    colectivoId,
    titulo,
    descripcion,
    compromisoEsperado,
    modalidadColaboracion,
    habilidadesNecesarias,
  }) {
    const colectivo = this.#colectivoService.buscarPorId(colectivoId);
    const habilidades = this.#habilidadService.resolverPorCodigos(habilidadesNecesarias);

    const proyecto = new Proyecto({
      titulo,
      descripcion,
      compromisoEsperado: new Compromiso(compromisoEsperado),
      modalidadColaboracion: new ModalidadColaboracion(modalidadColaboracion),
      habilidadesNecesarias: habilidades,
    });

    colectivo.agregarProyecto(proyecto);
    this.#colectivoRepository.guardar(colectivo);

    return proyecto;
  }

  listar() {
    return this.#colectivoRepository.listarProyectos();
  }

  listarPorColectivo(colectivoId) {
    return this.#colectivoService.buscarPorId(colectivoId).proyectos;
  }

  buscarPorId(proyectoId) {
    const resultado = this.#colectivoRepository.buscarProyecto(proyectoId);
    if (!resultado) {
      throw new NotFoundError(`No existe un proyecto con id "${proyectoId}"`);
    }
    return resultado.proyecto;
  }

  /** Devuelve { colectivo, proyecto }: lo necesitan las operaciones
   *  que además tienen que persistir el colectivo contenedor. */
  buscarConColectivo(proyectoId) {
    const resultado = this.#colectivoRepository.buscarProyecto(proyectoId);
    if (!resultado) {
      throw new NotFoundError(`No existe un proyecto con id "${proyectoId}"`);
    }
    return resultado;
  }

  actualizar(proyectoId, { titulo, descripcion }) {
    const { colectivo, proyecto } = this.buscarConColectivo(proyectoId);
    proyecto.actualizarDatos({ titulo, descripcion });
    this.#colectivoRepository.guardar(colectivo);
    return proyecto;
  }

  agregarHabilidadRequerida(proyectoId, codigoHabilidad) {
    const { colectivo, proyecto } = this.buscarConColectivo(proyectoId);
    const [habilidad] = this.#habilidadService.resolverPorCodigos([codigoHabilidad]);

    proyecto.agregarHabilidadRequerida(habilidad);
    this.#colectivoRepository.guardar(colectivo);
    return proyecto;
  }

  quitarHabilidadRequerida(proyectoId, codigoHabilidad) {
    const { colectivo, proyecto } = this.buscarConColectivo(proyectoId);
    const [habilidad] = this.#habilidadService.resolverPorCodigos([codigoHabilidad]);

    proyecto.quitarHabilidadRequerida(habilidad);
    this.#colectivoRepository.guardar(colectivo);
    return proyecto;
  }

  finalizar(proyectoId) {
    const { colectivo, proyecto } = this.buscarConColectivo(proyectoId);
    proyecto.finalizarProyecto();
    this.#colectivoRepository.guardar(colectivo);
    return proyecto;
  }
}
