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

  async crear({ nombreFantasia, nombre, apellido, cuentaGit, pronombres, presentacion, codigosHabilidades }) {
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
      // await ANTES del forEach: resolverPorCodigos ahora devuelve una promesa
      const habilidades = await this.habilidadService.resolverPorCodigos(codigosHabilidades);
      habilidades.forEach((h) => colaborador.agregarHabilidad(h));
    }

    return this.colaboradorRepository.guardar(colaborador);
  }

  async listar({ numeroPagina = 1, limitePorPagina = 10 } = {}) {
    return armarPaginado(
      await this.colaboradorRepository.listarPaginado(numeroPagina, limitePorPagina),
      numeroPagina,
      limitePorPagina,
    );
  }

  async buscarPorId(id) {
    const colaborador = await this.colaboradorRepository.buscarPorId(id);

    if (!colaborador) {
      throw new NotFoundError(`No existe un colaborador con id "${id}"`);
    }

    return colaborador;
  }

  async actualizar(id, { pronombres, presentacion }) {
    const colaborador = await this.buscarPorId(id);

    if (pronombres !== undefined) {
      colaborador.reemplazarPronombres(pronombres);
    }

    if (presentacion !== undefined) {
      colaborador.presentacion = presentacion;
    }

    return this.colaboradorRepository.guardar(colaborador);
  }

  async agregarPronombre(id, pronombre) {
    const colaborador = await this.buscarPorId(id);

    if (colaborador.tienePronombre(pronombre)) {
      throw new ConflictError(`El colaborador ya tiene el pronombre "${pronombre}"`);
    }

    colaborador.agregarPronombre(pronombre);
    return this.colaboradorRepository.guardar(colaborador);
  }

  async quitarPronombre(id, pronombre) {
    const colaborador = await this.buscarPorId(id);
    colaborador.quitarPronombre(pronombre);
    return this.colaboradorRepository.guardar(colaborador);
  }

  async agregarHabilidad(id, codigoHabilidad) {
    const colaborador = await this.buscarPorId(id);
    const [habilidad] = await this.habilidadService.resolverPorCodigos([codigoHabilidad]);

    colaborador.agregarHabilidad(habilidad);
    return this.colaboradorRepository.guardar(colaborador);
  }

  async quitarHabilidad(id, codigoHabilidad) {
    const colaborador = await this.buscarPorId(id);
    const [habilidad] = await this.habilidadService.resolverPorCodigos([codigoHabilidad]);

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
