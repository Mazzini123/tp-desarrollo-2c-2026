import { DomainError } from "../errors/DomainError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { ConflictError } from "../errors/ConflictError.js";
import { esPeriodoCompromisoValido } from "../domain/enums/PERIODO_COMPROMISO.js";
import {
  MODALIDAD_COLABORACION,
  esModalidadColaboracionValida,
} from "../domain/enums/MODALIDAD_COLABORACION.js";
import { MODO_ACEPTACION } from "../domain/enums/MODO_ACEPTACION.js";
import {
  aplicarModoDeAceptacion,
  notificarResoluciones,
  validarModoDeAceptacion,
} from "./reglasDePostulacion.js";

export class PerfilService {
  constructor({ colectivoRepository, habilidadService, notificacionService }) {
    this.colectivoRepository = colectivoRepository;
    this.habilidadService = habilidadService;
    this.notificacionService = notificacionService;
  }

  async listar(proyectoId) {
    return (await this.buscarProyectoConColectivo(proyectoId)).proyecto.perfiles;
  }

  async buscarProyectoConColectivo(proyectoId) {
    const resultado = await this.colectivoRepository.buscarProyecto(proyectoId);

    if (!resultado) {
      throw new NotFoundError(`No existe un proyecto con id "${proyectoId}"`);
    }

    return resultado;
  }

  async buscarPerfilConProyecto(proyectoId, perfilId) {
    const resultado = await this.colectivoRepository.buscarPerfil(proyectoId, perfilId);

    if (!resultado) {
      throw new NotFoundError(
        `No existe un perfil con id "${perfilId}" en el proyecto "${proyectoId}"`,
      );
    }

    return resultado;
  }

  async buscarPorId(proyectoId, perfilId) {
    return (await this.buscarPerfilConProyecto(proyectoId, perfilId)).perfil;
  }

  verificarProyectoAbierto(proyecto, accion) {
    if (!proyecto.estaAbierto()) {
      throw new ConflictError(`No se puede ${accion} un proyecto finalizado`);
    }
  }

  async crear(proyectoId, datos) {
    const { colectivo, proyecto } = await this.buscarProyectoConColectivo(proyectoId);
    this.verificarProyectoAbierto(proyecto, "agregar perfiles a");

    const perfil = proyecto.agregarPerfil(await this.construirPerfil(datos));
    await this.colectivoRepository.guardar(colectivo);
    return perfil;
  }

  async actualizar(
    proyectoId,
    perfilId,
    {
      titulo,
      descripcion,
      compromiso,
      modalidadColaboracion,
      busquedaAbierta,
      fechaCierreBusqueda,
      limiteColaboraciones,
      modoAceptacion,
      codigosHabilidadesRequeridas,
      codigosHabilidadesOpcionales,
      versionEdicion,
    },
    ahora = new Date(),
  ) {
    const { colectivo, proyecto, perfil } = await this.buscarPerfilConProyecto(
      proyectoId,
      perfilId,
    );
    this.verificarEdicion(proyecto, perfil, versionEdicion);

    let habilidades;
    if (
      codigosHabilidadesRequeridas !== undefined ||
      codigosHabilidadesOpcionales !== undefined
    ) {
      if (
        !versionEdicion ||
        codigosHabilidadesRequeridas === undefined ||
        codigosHabilidadesOpcionales === undefined
      ) {
        throw new DomainError(
          "Para actualizar las habilidades se necesitan ambos grupos y la versión del perfil",
        );
      }
      habilidades = await this.construirHabilidades(
        codigosDeHabilidades(codigosHabilidadesRequeridas, codigosHabilidadesOpcionales),
        perfil,
      );
      this.verificarEdicion(proyecto, perfil, versionEdicion);
    }

    const nuevoCompromiso =
      compromiso === undefined ? undefined : this.construirCompromiso(compromiso);
    const nuevaModalidad =
      modalidadColaboracion === undefined
        ? undefined
        : this.resolverModalidadColaboracion(modalidadColaboracion);
    const cambiaAceptacion =
      modoAceptacion !== undefined || limiteColaboraciones !== undefined;
    const nuevoModo = modoAceptacion ?? perfil.modoAceptacion;
    const nuevoLimite =
      limiteColaboraciones === undefined
        ? perfil.limiteColaboraciones
        : limiteColaboraciones;
    if (cambiaAceptacion) {
      validarModoDeAceptacion(nuevoModo, nuevoLimite, proyecto.cantidadAceptadas(perfil));
    }

    if (titulo !== undefined) perfil.titulo = titulo;
    if (descripcion !== undefined) perfil.descripcion = descripcion;
    if (nuevoCompromiso !== undefined) perfil.compromiso = nuevoCompromiso;
    if (nuevaModalidad !== undefined) perfil.modalidadColaboracion = nuevaModalidad;
    if (busquedaAbierta !== undefined) perfil.busquedaAbierta = busquedaAbierta;
    if (fechaCierreBusqueda !== undefined)
      perfil.fechaCierreBusqueda = fechaCierreBusqueda;
    if (habilidades) {
      perfil.habilidadesRequeridas = habilidades.habilidadesRequeridas;
      perfil.habilidadesOpcionales = habilidades.habilidadesOpcionales;
    }
    let cambios = { aceptadas: [], rechazadas: [] };
    if (cambiaAceptacion) {
      perfil.modoAceptacion = nuevoModo;
      perfil.limiteColaboraciones = nuevoLimite;
      cambios = aplicarModoDeAceptacion(proyecto, perfil, ahora);
    }

    await this.colectivoRepository.guardar(colectivo);
    await notificarResoluciones(this.notificacionService, proyecto, cambios);
    return perfil;
  }

  verificarEdicion(proyecto, perfil, versionEdicion) {
    this.verificarProyectoAbierto(proyecto, "modificar perfiles de");
    if (versionEdicion !== undefined && versionEdicion !== perfil.versionEdicion) {
      throw new ConflictError("El perfil fue modificado desde que se abrió la edición");
    }
  }

  async eliminar(proyectoId, perfilId) {
    const { colectivo, proyecto, perfil } = await this.buscarPerfilConProyecto(
      proyectoId,
      perfilId,
    );
    this.verificarProyectoAbierto(proyecto, "eliminar perfiles de");

    if (proyecto.perfiles.length <= 1) {
      throw new DomainError("El proyecto debe conservar al menos un perfil");
    }

    proyecto.quitarPerfil(perfil);
    await this.colectivoRepository.guardar(colectivo);
  }

  async agregarHabilidadRequerida(proyectoId, perfilId, codigoHabilidad) {
    const { colectivo, proyecto, perfil } = await this.buscarPerfilConProyecto(
      proyectoId,
      perfilId,
    );
    this.verificarProyectoAbierto(proyecto, "agregar habilidades a perfiles de");

    const [habilidad] = await this.habilidadService.resolverPorCodigos([codigoHabilidad]);

    if (perfil.tieneHabilidadOpcional(habilidad)) {
      throw new ConflictError(
        `La habilidad "${codigoHabilidad}" ya es opcional en este perfil`,
      );
    }

    if (perfil.tieneHabilidadRequerida(habilidad)) {
      throw new ConflictError(
        `La habilidad "${codigoHabilidad}" ya es requerida en este perfil`,
      );
    }

    perfil.agregarHabilidadRequerida(habilidad);
    await this.colectivoRepository.guardar(colectivo);
    return perfil;
  }

  async quitarHabilidadRequerida(proyectoId, perfilId, codigoHabilidad) {
    const { colectivo, proyecto, perfil } = await this.buscarPerfilConProyecto(
      proyectoId,
      perfilId,
    );
    this.verificarProyectoAbierto(proyecto, "quitar habilidades de perfiles de");

    const habilidad = perfil.habilidadesRequeridas.find(
      (item) => item.codigo === codigoHabilidad,
    );

    if (!habilidad) {
      throw new NotFoundError(
        `La habilidad "${codigoHabilidad}" no es requerida por el perfil "${perfilId}"`,
      );
    }

    if (perfil.habilidadesRequeridas.length <= 1) {
      throw new DomainError("El perfil debe conservar al menos una habilidad requerida");
    }

    perfil.quitarHabilidadRequerida(habilidad);
    await this.colectivoRepository.guardar(colectivo);
    return perfil;
  }

  async agregarHabilidadOpcional(proyectoId, perfilId, codigoHabilidad) {
    const { colectivo, proyecto, perfil } = await this.buscarPerfilConProyecto(
      proyectoId,
      perfilId,
    );
    this.verificarProyectoAbierto(proyecto, "agregar habilidades a perfiles de");

    const [habilidad] = await this.habilidadService.resolverPorCodigos([codigoHabilidad]);

    if (perfil.tieneHabilidadRequerida(habilidad)) {
      throw new ConflictError(
        `La habilidad "${codigoHabilidad}" ya es requerida en este perfil`,
      );
    }

    if (perfil.tieneHabilidadOpcional(habilidad)) {
      throw new ConflictError(
        `La habilidad "${codigoHabilidad}" ya es opcional en este perfil`,
      );
    }

    perfil.agregarHabilidadOpcional(habilidad);
    await this.colectivoRepository.guardar(colectivo);
    return perfil;
  }

  async quitarHabilidadOpcional(proyectoId, perfilId, codigoHabilidad) {
    const { colectivo, proyecto, perfil } = await this.buscarPerfilConProyecto(
      proyectoId,
      perfilId,
    );
    this.verificarProyectoAbierto(proyecto, "quitar habilidades de perfiles de");

    const habilidad = perfil.habilidadesOpcionales.find(
      (item) => item.codigo === codigoHabilidad,
    );

    if (!habilidad) {
      throw new NotFoundError(
        `La habilidad "${codigoHabilidad}" no es opcional en el perfil "${perfilId}"`,
      );
    }

    perfil.quitarHabilidadOpcional(habilidad);
    await this.colectivoRepository.guardar(colectivo);
    return perfil;
  }

  resolverModalidadColaboracion(modalidadColaboracion) {
    if (modalidadColaboracion === undefined || modalidadColaboracion === null) {
      return MODALIDAD_COLABORACION.GRATUITA;
    }

    if (!esModalidadColaboracionValida(modalidadColaboracion)) {
      throw new DomainError(
        `Modalidad de colaboración inválida: ${modalidadColaboracion}`,
      );
    }

    return modalidadColaboracion;
  }

  construirCompromiso(datos) {
    const { cantidadHoras, periodo } = datos;

    if (!Number.isInteger(cantidadHoras) || cantidadHoras <= 0) {
      throw new DomainError("cantidadHoras debe ser un entero positivo");
    }

    if (!esPeriodoCompromisoValido(periodo)) {
      throw new DomainError(`Período de compromiso inválido: ${periodo}`);
    }

    return { cantidadHoras, periodo };
  }

  async construirPerfil({
    titulo = null,
    descripcion,
    compromiso,
    modalidadColaboracion,
    codigosHabilidadesRequeridas,
    codigosHabilidadesOpcionales = [],
    busquedaAbierta = true,
    fechaCierreBusqueda = null,
    limiteColaboraciones = null,
    modoAceptacion = MODO_ACEPTACION.REVISION_MANUAL,
  }) {
    const codigos = codigosDeHabilidades(
      codigosHabilidadesRequeridas,
      codigosHabilidadesOpcionales,
    );
    validarModoDeAceptacion(modoAceptacion, limiteColaboraciones);

    return {
      titulo,
      descripcion,
      compromiso: this.construirCompromiso(compromiso),
      modalidadColaboracion: this.resolverModalidadColaboracion(modalidadColaboracion),
      ...(await this.construirHabilidades(codigos)),
      busquedaAbierta,
      fechaCierreBusqueda,
      limiteColaboraciones,
      modoAceptacion,
    };
  }

  async construirHabilidades({ requeridas, opcionales }, perfil) {
    const [habilidadesRequeridas, habilidadesOpcionales] = await Promise.all([
      this.resolverGrupoDeHabilidades(requeridas, perfil?.habilidadesRequeridas),
      this.resolverGrupoDeHabilidades(opcionales, perfil?.habilidadesOpcionales),
    ]);
    return { habilidadesRequeridas, habilidadesOpcionales };
  }

  async resolverGrupoDeHabilidades(codigos, existentes = []) {
    const porCodigo = new Map(
      existentes.map((habilidad) => [habilidad.codigo, habilidad]),
    );
    const nuevas = codigos.filter((codigo) => !porCodigo.has(codigo));
    if (nuevas.length > 0) {
      for (const habilidad of await this.habilidadService.resolverPorCodigos(nuevas)) {
        porCodigo.set(habilidad.codigo, habilidad);
      }
    }
    return codigos.map((codigo) => porCodigo.get(codigo));
  }
}

function codigosDeHabilidades(codigosRequeridos, codigosOpcionales) {
  if (!Array.isArray(codigosRequeridos) || codigosRequeridos.length === 0) {
    throw new DomainError("El perfil debe tener al menos una habilidad requerida");
  }
  if (!Array.isArray(codigosOpcionales)) {
    throw new DomainError("Las habilidades opcionales deben ser una lista");
  }

  const requeridas = [...new Set(codigosRequeridos)];
  const opcionales = [...new Set(codigosOpcionales)];
  const requeridasSet = new Set(requeridas);
  const repetidas = opcionales.filter((codigo) => requeridasSet.has(codigo));
  if (repetidas.length > 0) {
    throw new DomainError(
      `Una habilidad no puede ser requerida y opcional al mismo tiempo: ${repetidas.join(", ")}`,
    );
  }
  return { requeridas, opcionales };
}
