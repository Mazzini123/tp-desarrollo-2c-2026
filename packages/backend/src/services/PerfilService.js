import { notificarResoluciones } from "./soporte/notificarResoluciones.js";
import { DomainError } from "../errors/DomainError.js";
import { BadRequestError } from "../errors/BadRequestError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { buscarPerfilOFallar, buscarProyectoOFallar } from "./soporte/buscarOFallar.js";
import { ConflictError } from "../errors/ConflictError.js";
import { MODALIDAD_COLABORACION } from "../domain/enums/MODALIDAD_COLABORACION.js";
import { MODO_ACEPTACION } from "../domain/enums/MODO_ACEPTACION.js";
import {
  aplicarModoDeAceptacion,
  validarModoDeAceptacion,
} from "./reglasDePostulacion.js";

const GRUPOS = {
  requerida: {
    nombre: "requerida",
    otro: "opcional",
    minimo: 1,
    lista: (perfil) => perfil.habilidadesRequeridas,
    tiene: (perfil, habilidad) => perfil.tieneHabilidadRequerida(habilidad),
    agregar: (perfil, habilidad) => perfil.agregarHabilidadRequerida(habilidad),
    quitar: (perfil, habilidad) => perfil.quitarHabilidadRequerida(habilidad),
  },
  opcional: {
    nombre: "opcional",
    otro: "requerida",
    minimo: 0,
    lista: (perfil) => perfil.habilidadesOpcionales,
    tiene: (perfil, habilidad) => perfil.tieneHabilidadOpcional(habilidad),
    agregar: (perfil, habilidad) => perfil.agregarHabilidadOpcional(habilidad),
    quitar: (perfil, habilidad) => perfil.quitarHabilidadOpcional(habilidad),
  },
};

export class PerfilService {
  constructor({
    proyectoRepository,
    habilidadService,
    notificacionService,
    transacciones,
  }) {
    this.transacciones = transacciones;
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
    return this.transacciones.ejecutar(async () => {
      const { proyecto, perfil } = await this.buscarPerfilConProyecto(
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
          throw new BadRequestError(
            "Para actualizar las habilidades se necesitan ambos grupos y la versión del perfil",
          );
        }
        habilidades = await this.construirHabilidades(
          codigosDeHabilidades(
            codigosHabilidadesRequeridas,
            codigosHabilidadesOpcionales,
          ),
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
        validarModoDeAceptacion(
          nuevoModo,
          nuevoLimite,
          proyecto.cantidadAceptadas(perfil),
        );
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
    });
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

    if (proyecto.colaboraciones.some((c) => String(c.perfil) === perfil.id)) {
      throw new ConflictError(
        "No se puede eliminar un perfil con postulaciones o colaboraciones; cerrá su búsqueda para conservar el historial",
      );
    }
    proyecto.quitarPerfil(perfil);
    await this.proyectoRepository.guardar(proyecto);
  }

  async agregarHabilidadRequerida(proyectoId, perfilId, codigoHabilidad) {
    return this.agregarHabilidad(GRUPOS.requerida, proyectoId, perfilId, codigoHabilidad);
  }

  async agregarHabilidadOpcional(proyectoId, perfilId, codigoHabilidad) {
    return this.agregarHabilidad(GRUPOS.opcional, proyectoId, perfilId, codigoHabilidad);
  }

  async quitarHabilidadRequerida(proyectoId, perfilId, codigoHabilidad) {
    return this.quitarHabilidad(GRUPOS.requerida, proyectoId, perfilId, codigoHabilidad);
  }

  async quitarHabilidadOpcional(proyectoId, perfilId, codigoHabilidad) {
    return this.quitarHabilidad(GRUPOS.opcional, proyectoId, perfilId, codigoHabilidad);
  }

  async agregarHabilidad(grupo, proyectoId, perfilId, codigoHabilidad) {
    const { proyecto, perfil } = await this.buscarPerfilConProyecto(proyectoId, perfilId);
    this.verificarProyectoAbierto(proyecto, "agregar habilidades a perfiles de");

    const [habilidad] = await this.habilidadService.resolverPorCodigos([codigoHabilidad]);
    for (const existente of [GRUPOS[grupo.otro], grupo]) {
      if (existente.tiene(perfil, habilidad)) {
        throw new ConflictError(
          `La habilidad "${codigoHabilidad}" ya es ${existente.nombre} en este perfil`,
        );
      }
    }

    grupo.agregar(perfil, habilidad);
    await this.proyectoRepository.guardar(proyecto);
    return perfil;
  }

  async quitarHabilidad(grupo, proyectoId, perfilId, codigoHabilidad) {
    const { proyecto, perfil } = await this.buscarPerfilConProyecto(proyectoId, perfilId);
    this.verificarProyectoAbierto(proyecto, "quitar habilidades de perfiles de");

    const lista = grupo.lista(perfil);
    const habilidad = lista.find((item) => item.codigo === codigoHabilidad);
    if (!habilidad) {
      throw new NotFoundError(
        `La habilidad "${codigoHabilidad}" no es ${grupo.nombre} en el perfil "${perfilId}"`,
      );
    }
    if (grupo.minimo && lista.length <= grupo.minimo) {
      throw new DomainError("El perfil debe conservar al menos una habilidad requerida");
    }

    grupo.quitar(perfil, habilidad);
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
    const habilidadesRequeridas = await this.resolverGrupoDeHabilidades(
      requeridas,
      perfil?.habilidadesRequeridas,
    );
    const habilidadesOpcionales = await this.resolverGrupoDeHabilidades(
      opcionales,
      perfil?.habilidadesOpcionales,
    );
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
