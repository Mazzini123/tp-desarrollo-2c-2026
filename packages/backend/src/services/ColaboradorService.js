import { Colaborador } from "../domain/Colaborador.js";
import { MedioDeContacto } from "../domain/MedioDeContacto.js";
import { construirRedesSociales } from "../domain/RedSocial.js";
import { esTipoMedioContactoValido } from "../domain/enums/TIPOS_MEDIOS_CONTACTO.js";
import { DomainError } from "../errors/DomainError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { ConflictError } from "../errors/ConflictError.js";
import { armarPaginado } from "../utils/paginacion.js";

export class ColaboradorService {
  constructor({ colaboradorRepository, habilidadService }) {
    this.colaboradorRepository = colaboradorRepository;
    this.habilidadService = habilidadService;
  }

  async crear({
    nombreFantasia,
    nombre,
    apellido,
    cuentaGit,
    pronombres,
    presentacion,
    codigosHabilidades,
    recibeMensajeriaInterna = true,
    mediosDeContacto = [],
    redesSociales = [],
  }) {
    this.validarIdentificacion({ nombreFantasia, nombre, apellido, cuentaGit });

    const colaborador = new Colaborador({
      nombreFantasia,
      nombre,
      apellido,
      cuentaGit,
      presentacion,
      recibeMensajeriaInterna,
    });

    colaborador.redesSociales = construirRedesSociales(redesSociales);

    mediosDeContacto.forEach((datos) => {
      const medio = this.construirMedioDeContacto(datos);
      // En el alta un repetido se ignora, igual que los pronombres del payload.
      if (!colaborador.tieneMedioDeContacto(medio)) {
        colaborador.agregarMedioDeContacto(medio);
      }
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

  async actualizar(id, { pronombres, presentacion, recibeMensajeriaInterna, redesSociales }) {
    const colaborador = await this.buscarPorId(id);

    if (redesSociales !== undefined) {
      colaborador.redesSociales = construirRedesSociales(redesSociales);
    }

    if (recibeMensajeriaInterna !== undefined) {
      colaborador.recibeMensajeriaInterna = recibeMensajeriaInterna;
    }

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

  // Los medios de contacto se registran pero no se muestran (ver
  // Colaborador.toJSON): por eso el alta devuelve solo el medio cargado.
  async agregarMedioDeContacto(id, datos) {
    const colaborador = await this.buscarPorId(id);
    const medio = this.construirMedioDeContacto(datos);

    if (colaborador.tieneMedioDeContacto(medio)) {
      throw new ConflictError(`El colaborador ya tiene registrado ese medio de contacto`);
    }

    colaborador.agregarMedioDeContacto(medio);
    await this.colaboradorRepository.guardar(colaborador);
    return medio;
  }

  async quitarMedioDeContacto(id, datos) {
    const colaborador = await this.buscarPorId(id);
    const medio = this.construirMedioDeContacto(datos);

    if (!colaborador.tieneMedioDeContacto(medio)) {
      throw new NotFoundError("El colaborador no tiene registrado ese medio de contacto");
    }

    colaborador.quitarMedioDeContacto(medio);
    await this.colaboradorRepository.guardar(colaborador);
  }

  construirMedioDeContacto({ tipo, valor }) {
    if (!esTipoMedioContactoValido(tipo)) {
      throw new DomainError(`Tipo de medio de contacto invalido: ${tipo}`);
    }
    if (typeof valor !== "string" || valor.trim().length === 0) {
      throw new DomainError("El valor del medio de contacto es obligatorio");
    }
    return new MedioDeContacto({ tipo, valor: valor.trim() });
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
