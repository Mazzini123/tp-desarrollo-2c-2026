import { DomainError, ConflictError } from "../errors/index.js";
import { Habilidad } from "../domain/Habilidad.js";

/**
 * Alta y consulta del catálogo de habilidades. Precargado por seed
 * al arrancar el proceso, pero se expone también el alta para cuando
 * el equipo administrativo necesite sumar una habilidad nueva.
 */
export class HabilidadService {
  #habilidadRepository;

  constructor({ habilidadRepository }) {
    this.#habilidadRepository = habilidadRepository;
  }

  crear({ titulo, descripcion, usuario }) {
    const habilidad = Habilidad.crear({ titulo, descripcion, usuario });

    if (this.#habilidadRepository.existeCodigo(habilidad.codigo)) {
      throw new ConflictError(`Ya existe una habilidad con el código "${habilidad.codigo}"`);
    }

    return this.#habilidadRepository.guardar(habilidad);
  }

  listar() {
    return this.#habilidadRepository.listar();
  }

  /**
   * Resuelve códigos contra el catálogo. Lanza si alguno no existe o
   * está dado de baja: ni un proyecto ni un colaborador pueden
   * referenciar una habilidad inventada o inactiva.
   */
  resolverPorCodigos(codigos) {
    if (!Array.isArray(codigos) || codigos.length === 0) {
      throw new DomainError("Se debe indicar al menos un código de habilidad");
    }

    return codigos.map((codigo) => {
      const habilidad = this.#habilidadRepository.buscarPorId(codigo);
      if (!habilidad) {
        throw new DomainError(`No existe una habilidad con el código "${codigo}"`);
      }
      if (!habilidad.activo) {
        throw new DomainError(`La habilidad "${codigo}" está dada de baja`);
      }
      return habilidad;
    });
  }
}
