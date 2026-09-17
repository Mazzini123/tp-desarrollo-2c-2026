import { Colaborador } from "../domain/Colaborador.js";
import { Habilidad } from "../domain/Habilidad.js";
import { DomainError } from "../errors/DomainError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
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

    // Alta: la intencion es "dejame esta lista", asi que se deduplica en
    // silencio en vez de tirar 409 por un duplicado del propio payload.
    if (pronombres) {
      colaborador.reemplazarPronombres(pronombres);
    }

    if (codigosHabilidades && codigosHabilidades.length > 0) {
      this.habilidadService.resolverPorCodigos(codigosHabilidades).forEach((h) => {
        this.validarInstanciaHabilidad(h);
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

    this.validarInstanciaHabilidad(habilidad);
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

  validarInstanciaHabilidad(habilidad) {
    if (!(habilidad instanceof Habilidad)) {
      throw new DomainError("Se esperaba una instancia de Habilidad");
    }
  }
}
