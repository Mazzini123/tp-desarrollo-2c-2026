import { Colaborador } from "../domain/Colaborador.js";
import { NotFoundError } from "../errors/index.js";
import { armarPaginado } from "./paginacion.js";

export class ColaboradorService {
  constructor({ colaboradorRepository, habilidadService }) {
    this.colaboradorRepository = colaboradorRepository;
    this.habilidadService = habilidadService;
  }

  crear({ nombreFantasia, nombre, apellido, cuentaGit, pronombres, presentacion, habilidades }) {
    const colaborador = new Colaborador({
      nombreFantasia,
      nombre,
      apellido,
      cuentaGit,
      pronombres,
      presentacion,
    });

    if (habilidades && habilidades.length > 0) {
      this.habilidadService
        .resolverPorCodigos(habilidades)
        .forEach((h) => colaborador.agregarHabilidad(h));
    }

    return this.colaboradorRepository.guardar(colaborador);
  }

  listar({ numeroPagina = 1, limitePorPagina = 10 } = {}) {
    return armarPaginado(
      this.colaboradorRepository.listarPaginado(numeroPagina, limitePorPagina),
      numeroPagina,
      limitePorPagina,
    );
  }

  buscarPorId(id) {
    const colaborador = this.colaboradorRepository.buscarPorId(id);
    if (!colaborador) {
      throw new NotFoundError(`No existe un colaborador con id "${id}"`);
    }
    return colaborador;
  }

  actualizar(id, { pronombres, presentacion }) {
    const colaborador = this.buscarPorId(id);
    colaborador.actualizarDatos({ pronombres, presentacion });
    return this.colaboradorRepository.guardar(colaborador);
  }

  agregarHabilidad(id, codigoHabilidad) {
    const colaborador = this.buscarPorId(id);
    const [habilidad] = this.habilidadService.resolverPorCodigos([codigoHabilidad]);

    colaborador.agregarHabilidad(habilidad);
    return this.colaboradorRepository.guardar(colaborador);
  }

  quitarHabilidad(id, codigoHabilidad) {
    const colaborador = this.buscarPorId(id);
    const [habilidad] = this.habilidadService.resolverPorCodigos([codigoHabilidad]);

    colaborador.quitarHabilidad(habilidad);
    return this.colaboradorRepository.guardar(colaborador);
  }
}
