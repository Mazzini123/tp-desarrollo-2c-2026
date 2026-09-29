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

   async crear({ titulo, descripcion, usuario }) {
    if (!tieneContenido(titulo)) {
      throw new DomainError("El título de la habilidad es obligatorio");
    }

    const codigo = normalizarASnakeCase(titulo);
    if (await this.habilidadRepository.existeCodigo(codigo)) {
      throw new ConflictError(`Ya existe una habilidad con el código "${codigo}"`);
    }

    const habilidad = new Habilidad({ titulo, descripcion, usuario });

    return this.habilidadRepository.guardar(habilidad);
  }

  async listar({ numeroPagina = 1, limitePorPagina = 10 } = {}) {
    return armarPaginado(
      await this.habilidadRepository.listarPaginado(numeroPagina, limitePorPagina),
      numeroPagina,
      limitePorPagina,
    );
  }

  async listarTodas() {
    return this.habilidadRepository.listar();
  }

  async resolverPorCodigos(codigos) {
    if (!Array.isArray(codigos) || codigos.length === 0) {
      throw new DomainError("Se debe indicar al menos un código de habilidad");
    }

    // map + async devuelve un array de PROMESAS.
    // Promise.all espera a todas y devuelve el array de resultados.
    return Promise.all(
      codigos.map(async (codigo) => {
        const habilidad = await this.habilidadRepository.buscarPorId(codigo);
        if (!habilidad) {
          throw new NotFoundError(`No existe una habilidad con el código "${codigo}"`);
        }
        if (!habilidad.activo) {
          throw new DomainError(`La habilidad "${codigo}" está dada de baja`);
        }
        return habilidad;
      }),
    );
  }
}