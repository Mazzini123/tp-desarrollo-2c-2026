import { DomainError } from "../errors/DomainError.js";
import { ConflictError } from "../errors/ConflictError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { normalizarASnakeCase } from "../domain/Habilidad.js";
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

    return this.habilidadRepository.crear({ titulo, codigo, descripcion, usuario });
  }

  async listar({ numeroPagina = 1, limitePorPagina = 10 } = {}) {
    const pagina = { numeroPagina, limitePorPagina };
    return armarPaginado(await this.habilidadRepository.listarPaginado(pagina), pagina);
  }

  async listarTodas() {
    return this.habilidadRepository.listar();
  }

  async resolverPorCodigos(codigos) {
    if (!Array.isArray(codigos) || codigos.length === 0) {
      throw new DomainError("Se debe indicar al menos un código de habilidad");
    }

    const habilidades = await this.habilidadRepository.buscarPorCodigos(codigos);
    const porCodigo = new Map(habilidades.map((h) => [h.codigo, h]));
    return codigos.map((codigo) => {
      const habilidad = porCodigo.get(codigo);
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
