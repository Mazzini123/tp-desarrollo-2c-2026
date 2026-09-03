import { DomainError } from "../domain/DomainError.js";
import { Habilidad } from "../domain/Habilidad.js";

/**
 * Alta del catálogo de habilidades. Precargado por seed al arrancar
 * el proceso, pero se expone también el endpoint de alta para cuando
 * el equipo administrativo necesite sumar una habilidad nueva.
 */
export class HabilidadService {
  #habilidadRepository;

  constructor({ habilidadRepository }) {
    this.#habilidadRepository = habilidadRepository;
  }

  crear({ titulo, descripcion }) {
    const habilidad = Habilidad.crear({ titulo, descripcion });

    if (this.#habilidadRepository.existeCodigo(habilidad.codigo)) {
      throw new DomainError(`Ya existe una habilidad con el código "${habilidad.codigo}"`);
    }

    return this.#habilidadRepository.guardar(habilidad);
  }

  listar() {
    return this.#habilidadRepository.listar();
  }

  /**
   * Resuelve una lista de códigos contra el catálogo. Lanza si algún
   * código no existe: un proyecto o una persona no pueden requerir
   * o tener una habilidad inventada.
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
      return habilidad;
    });
  }
}
