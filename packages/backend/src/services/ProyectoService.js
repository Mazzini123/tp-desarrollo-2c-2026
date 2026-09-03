import { Proyecto } from "../domain/Proyecto.js";
import { CompromisoEsperado } from "../domain/valueObjects/CompromisoEsperado.js";
import { ModalidadColaboracion } from "../domain/valueObjects/ModalidadColaboracion.js";
import { NotFoundError } from "../errors/NotFoundError.js";

/**
 * Casos de uso sobre Proyecto. Coordina Colectivo (validar que exista
 * el dueño) y Habilidad (resolver el catálogo), que es exactamente el
 * tipo de orquestación entre entidades que no le corresponde al
 * dominio anémico.
 */
export class ProyectoService {
  #proyectoRepository;
  #colectivoService;
  #habilidadService;

  constructor({ proyectoRepository, colectivoService, habilidadService }) {
    this.#proyectoRepository = proyectoRepository;
    this.#colectivoService = colectivoService;
    this.#habilidadService = habilidadService;
  }

  crear({
    titulo,
    descripcion,
    colectivoId,
    compromisoEsperado,
    modalidadColaboracion,
    habilidadesRequeridas,
  }) {
    // Lanza NotFoundError si el colectivo no existe.
    this.#colectivoService.buscarPorId(colectivoId);

    const habilidades = this.#habilidadService.resolverPorCodigos(habilidadesRequeridas);

    const proyecto = new Proyecto({
      titulo,
      descripcion,
      colectivoId,
      compromisoEsperado: new CompromisoEsperado(compromisoEsperado),
      modalidadColaboracion: new ModalidadColaboracion(modalidadColaboracion),
      habilidadesRequeridas: habilidades,
    });

    return this.#proyectoRepository.guardar(proyecto);
  }

  listar() {
    return this.#proyectoRepository.listar();
  }

  buscarPorId(id) {
    const proyecto = this.#proyectoRepository.buscarPorId(id);
    if (!proyecto) {
      throw new NotFoundError(`No existe un proyecto con id "${id}"`);
    }
    return proyecto;
  }

  actualizar(id, { titulo, descripcion }) {
    const proyecto = this.buscarPorId(id);
    proyecto.actualizarDatos({ titulo, descripcion });
    return this.#proyectoRepository.guardar(proyecto);
  }

  agregarHabilidadRequerida(id, codigoHabilidad) {
    const proyecto = this.buscarPorId(id);
    const [habilidad] = this.#habilidadService.resolverPorCodigos([codigoHabilidad]);

    proyecto.agregarHabilidadRequerida(habilidad);
    return this.#proyectoRepository.guardar(proyecto);
  }

  quitarHabilidadRequerida(id, codigoHabilidad) {
    const proyecto = this.buscarPorId(id);
    const [habilidad] = this.#habilidadService.resolverPorCodigos([codigoHabilidad]);

    proyecto.quitarHabilidadRequerida(habilidad);
    return this.#proyectoRepository.guardar(proyecto);
  }

  finalizar(id) {
    const proyecto = this.buscarPorId(id);
    proyecto.finalizar();
    return this.#proyectoRepository.guardar(proyecto);
  }
}
