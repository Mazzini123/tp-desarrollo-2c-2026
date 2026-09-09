import { DomainError } from "../errors/DomainError.js";
import { ConflictError } from "../errors/ConflictError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { Habilidad, normalizarASnakeCase } from "../domain/Habilidad.js";
import { tieneContenido } from "../utils/validaciones.js";
import { armarPaginado } from "../utils/paginacion.js";

export class HabilidadService {
  constructor({ habilidadRepository }) {
    this.habilidadRepository = habilidadRepository;
  }

  crear({ titulo, descripcion, usuario }) {
    if (!tieneContenido(titulo)) {
      throw new DomainError("El título de la habilidad es obligatorio");
    }

    const codigo = normalizarASnakeCase(titulo);
    if (this.habilidadRepository.existeCodigo(codigo)) {
      throw new ConflictError(`Ya existe una habilidad con el código "${codigo}"`);
    }

    const habilidad = new Habilidad({ titulo, descripcion, usuario });

    return this.habilidadRepository.guardar(habilidad);
  }

  listar({ numeroPagina = 1, limitePorPagina = 10 } = {}) {
    return armarPaginado(
      this.habilidadRepository.listarPaginado(numeroPagina, limitePorPagina),
      numeroPagina,
      limitePorPagina,
    );
  }

  listarTodas() {
    return this.habilidadRepository.listar();
  }

  resolverPorCodigos(codigos) {
    if (!Array.isArray(codigos) || codigos.length === 0) {
      throw new DomainError("Se debe indicar al menos un código de habilidad");
    }

    return codigos.map((codigo) => {
      const habilidad = this.habilidadRepository.buscarPorId(codigo);
      if (!habilidad) {
        throw new NotFoundError(`No existe una habilidad con el código "${codigo}"`);
      }
      if (!habilidad.activo) {
        throw new DomainError(`La habilidad "${codigo}" está dada de baja`);
      }
      return habilidad;
    });
  }
}
