import { Colaborador } from "../domain/Colaborador.js";
import { DomainError } from "../errors/DomainError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { ConflictError } from "../errors/ConflictError.js";
import { armarPaginado } from "../utils/paginacion.js";

export class ColaboradorService {
  constructor({ colaboradorRepository, habilidadService }) {
    this.colaboradorRepository = colaboradorRepository;
    this.habilidadService = habilidadService;
  }

  crear({ nombreFantasia, nombre, apellido, cuentaGit, pronombres, presentacion, codigosHabilidades }) {
    this.validarIdentificacion({ nombreFantasia, nombre, apellido, cuentaGit });

    const colaborador = new Colaborador({
      nombreFantasia,
      nombre,
      apellido,
      cuentaGit,
      presentacion,
    });

    if (pronombres) {
      colaborador.reemplazarPronombres(pronombres);
    }

    if (codigosHabilidades && codigosHabilidades.length > 0) {
      this.habilidadService.resolverPorCodigos(codigosHabilidades).forEach((h) => {
        colaborador.agregarHabilidad(h);
      });
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

    if (pronombres !== undefined) {
      colaborador.reemplazarPronombres(pronombres);
    }

    if (presentacion !== undefined) {
      colaborador.presentacion = presentacion;
    }

    return this.colaboradorRepository.guardar(colaborador);
  }

  agregarPronombre(id, pronombre) {
    const colaborador = this.buscarPorId(id);
    
    if (colaborador.tienePronombre(pronombre)) {
      throw new ConflictError(`El colaborador ya tiene el pronombre "${pronombre}"`);
    }

    colaborador.agregarPronombre(pronombre);
    return this.colaboradorRepository.guardar(colaborador);
  }

  quitarPronombre(id, pronombre) {
    const colaborador = this.buscarPorId(id);
    colaborador.quitarPronombre(pronombre);
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

  validarIdentificacion({ nombreFantasia, nombre, apellido, cuentaGit }) {
    const tieneNombreYApellido = Boolean(nombre) && Boolean(apellido);

    if (!nombreFantasia && !cuentaGit && !tieneNombreYApellido) {
      throw new DomainError(
        "El colaborador debe tener al menos un dato de identificación: " +
        "nombreFantasia, cuentaGit, o (nombre + apellido)",
      );
    }
  }
}
