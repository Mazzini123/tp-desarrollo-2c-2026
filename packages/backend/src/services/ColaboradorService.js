import { construirRedesSociales } from "../domain/RedSocial.js";
import { sinMediosRepetidos } from "../domain/MedioDeContacto.js";
import { DomainError } from "../errors/DomainError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { ConflictError } from "../errors/ConflictError.js";
import { armarPaginado } from "../utils/paginacion.js";
import { CODIGO_ERROR } from "../errors/CODIGO_ERROR.js";

export class ColaboradorService {
  constructor({
    colaboradorRepository,
    habilidadService,
    avisoAutomaticoService,
    transacciones,
  }) {
    this.transacciones = transacciones;
    this.colaboradorRepository = colaboradorRepository;
    this.habilidadService = habilidadService;
    this.avisoAutomaticoService = avisoAutomaticoService;
  }

  async crear(
    {
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
    },
    { avisar = true } = {},
  ) {
    return this.transacciones.ejecutar(async () => {
      this.validarIdentificacion({ nombreFantasia, nombre, apellido, cuentaGit });

      const habilidades =
        codigosHabilidades && codigosHabilidades.length > 0
          ? await this.habilidadService.resolverPorCodigos([
              ...new Set(codigosHabilidades),
            ])
          : [];

      const colaborador = await this.colaboradorRepository.crear({
        nombreFantasia,
        nombre,
        apellido,
        cuentaGit,
        presentacion,
        recibeMensajeriaInterna,
        pronombres: [...new Set(pronombres ?? [])],
        mediosDeContacto: sinMediosRepetidos(mediosDeContacto),
        redesSociales: construirRedesSociales(redesSociales),
        habilidades: habilidades.map(({ codigo, titulo }) => ({ codigo, titulo })),
      });
      if (avisar) {
        await this.avisarAlta(colaborador);
      }
      return colaborador;
    });
  }

  async avisarAlta(colaborador) {
    return this.avisoAutomaticoService.avisarPorColaboradorNuevo(colaborador);
  }

  exigirActiva(colaborador) {
    if (colaborador.estaDadaDeBaja()) {
      throw new ConflictError(
        "El perfil de colaboradora esta dado de baja",
        CODIGO_ERROR.COLABORADORA_DADA_DE_BAJA,
      );
    }
  }

  async darDeBaja(colaborador, ahora = new Date()) {
    this.exigirActiva(colaborador);
    colaborador.darDeBaja(ahora);
    return this.colaboradorRepository.guardar(colaborador);
  }

  async listar({ numeroPagina = 1, limitePorPagina = 10 } = {}) {
    const pagina = { numeroPagina, limitePorPagina };
    return armarPaginado(await this.colaboradorRepository.listarPaginado(pagina), pagina);
  }

  async mediosDeContacto(id) {
    const colaborador = await this.buscarPorId(id);
    return colaborador.mediosDeContacto.map(({ tipo, valor }) => ({ tipo, valor }));
  }

  async buscarPorId(id, { bloquear = false } = {}) {
    const colaborador = bloquear
      ? await this.colaboradorRepository.bloquear(id)
      : await this.colaboradorRepository.buscarPorId(id);

    if (!colaborador) {
      throw new NotFoundError(`No existe un colaborador con id "${id}"`);
    }

    return colaborador;
  }

  async actualizar(
    id,
    { pronombres, presentacion, recibeMensajeriaInterna, redesSociales },
  ) {
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

  async agregarMedioDeContacto(id, datos) {
    const colaborador = await this.buscarPorId(id);
    const [medio] = sinMediosRepetidos([datos]);

    if (colaborador.tieneMedioDeContacto(medio)) {
      throw new ConflictError(`El colaborador ya tiene registrado ese medio de contacto`);
    }

    colaborador.agregarMedioDeContacto(medio);
    await this.colaboradorRepository.guardar(colaborador);
    return medio;
  }

  async quitarMedioDeContacto(id, datos) {
    const colaborador = await this.buscarPorId(id);
    const [medio] = sinMediosRepetidos([datos]);

    if (!colaborador.tieneMedioDeContacto(medio)) {
      throw new NotFoundError("El colaborador no tiene registrado ese medio de contacto");
    }

    colaborador.quitarMedioDeContacto(medio);
    await this.colaboradorRepository.guardar(colaborador);
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
