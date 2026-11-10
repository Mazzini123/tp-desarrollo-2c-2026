import { DomainError } from "../errors/DomainError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { buscarPerfilOFallar, buscarProyectoOFallar } from "./soporte/buscarOFallar.js";
import { ConflictError } from "../errors/ConflictError.js";
import { MODALIDAD_COLABORACION } from "../domain/enums/MODALIDAD_COLABORACION.js";
import { MODO_ACEPTACION } from "../domain/enums/MODO_ACEPTACION.js";
import {
  aplicarModoDeAceptacion,
  notificarResoluciones,
  validarModoDeAceptacion,
} from "./reglasDePostulacion.js";

export class PerfilService {
  constructor({ proyectoRepository, habilidadService, notificacionService }) {
    this.proyectoRepository = proyectoRepository;
    this.habilidadService = habilidadService;
    this.notificacionService = notificacionService;
  }

  async listar(proyectoId) {
    return (await buscarProyectoOFallar(this.proyectoRepository, proyectoId)).perfiles;
  }

  async buscarPerfilConProyecto(proyectoId, perfilId) {
    return buscarPerfilOFallar(this.proyectoRepository, proyectoId, perfilId);
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
    const proyecto = await buscarProyectoOFallar(this.proyectoRepository, proyectoId);
    this.verificarProyectoAbierto(proyecto, "agregar perfiles a");

    const perfil = proyecto.agregarPerfil(await this.construirPerfil(datos));
    await this.proyectoRepository.guardar(proyecto);
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
    const { proyecto, perfil } = await this.buscarPerfilConProyecto(proyectoId, perfilId);
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
    if (compromiso !== undefined) perfil.compromiso = compromiso;
    if (modalidadColaboracion !== undefined) {
      perfil.modalidadColaboracion = modalidadColaboracion;
    }
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

    await this.proyectoRepository.guardar(proyecto);
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
    const { proyecto, perfil } = await this.buscarPerfilConProyecto(proyectoId, perfilId);
    this.verificarProyectoAbierto(proyecto, "eliminar perfiles de");

    if (proyecto.perfiles.length <= 1) {
      throw new DomainError("El proyecto debe conservar al menos un perfil");
    }

    proyecto.quitarPerfil(perfil);
    await this.proyectoRepository.guardar(proyecto);
  }

  async agregarHabilidadRequerida(proyectoId, perfilId, codigoHabilidad) {
    const { proyecto, perfil } = await this.buscarPerfilConProyecto(proyectoId, perfilId);
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
    await this.proyectoRepository.guardar(proyecto);
    return perfil;
  }

  async quitarHabilidadRequerida(proyectoId, perfilId, codigoHabilidad) {
    const { proyecto, perfil } = await this.buscarPerfilConProyecto(proyectoId, perfilId);
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
    await this.proyectoRepository.guardar(proyecto);
    return perfil;
  }

  async agregarHabilidadOpcional(proyectoId, perfilId, codigoHabilidad) {
    const { proyecto, perfil } = await this.buscarPerfilConProyecto(proyectoId, perfilId);
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
    await this.proyectoRepository.guardar(proyecto);
    return perfil;
  }

  async quitarHabilidadOpcional(proyectoId, perfilId, codigoHabilidad) {
    const { proyecto, perfil } = await this.buscarPerfilConProyecto(proyectoId, perfilId);
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
    await this.proyectoRepository.guardar(proyecto);
    return perfil;
  }

  async construirPerfil({
    titulo = null,
    descripcion,
    compromiso,
    modalidadColaboracion = MODALIDAD_COLABORACION.GRATUITA,
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
      compromiso,
      modalidadColaboracion,
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
