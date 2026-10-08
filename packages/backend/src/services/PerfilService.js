import { Perfil } from "../domain/Perfil.js";
import { Compromiso } from "../domain/Compromiso.js";
import { DomainError } from "../errors/DomainError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { ConflictError } from "../errors/ConflictError.js";
import { esPeriodoCompromisoValido } from "../domain/enums/PERIODO_COMPROMISO.js";
import {
  MODALIDAD_COLABORACION,
  esModalidadColaboracionValida,
} from "../domain/enums/MODALIDAD_COLABORACION.js";

export class PerfilService {
  constructor({ colectivoRepository, habilidadService }) {
    this.colectivoRepository = colectivoRepository;
    this.habilidadService = habilidadService;
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
      throw new NotFoundError(`No existe un perfil con id "${perfilId}" en el proyecto "${proyectoId}"`);
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

    const perfil = await this.construirPerfil(datos);
    proyecto.agregarPerfil(perfil);
    await this.colectivoRepository.guardar(colectivo);
    return perfil;
  }

  async actualizar(proyectoId, perfilId, { descripcion, compromiso, modalidadColaboracion }) {
    const { colectivo, proyecto, perfil } = await this.buscarPerfilConProyecto(proyectoId, perfilId);
    this.verificarProyectoAbierto(proyecto, "modificar perfiles de");

    if (descripcion !== undefined) {
      perfil.descripcion = descripcion;
    }

    if (compromiso !== undefined) {
      perfil.compromiso = this.construirCompromiso(compromiso);
    }

    if (modalidadColaboracion !== undefined) {
      perfil.modalidadColaboracion = this.resolverModalidadColaboracion(modalidadColaboracion);
    }

    await this.colectivoRepository.guardar(colectivo);
    return perfil;
  }

  async eliminar(proyectoId, perfilId) {
    const { colectivo, proyecto, perfil } = await this.buscarPerfilConProyecto(proyectoId, perfilId);
    this.verificarProyectoAbierto(proyecto, "eliminar perfiles de");

    if (proyecto.perfiles.length <= 1) {
      throw new DomainError("El proyecto debe conservar al menos un perfil");
    }

    proyecto.quitarPerfil(perfil);
    await this.colectivoRepository.guardar(colectivo);
  }

  async agregarHabilidadRequerida(proyectoId, perfilId, codigoHabilidad) {
    const { colectivo, proyecto, perfil } = await this.buscarPerfilConProyecto(proyectoId, perfilId);
    this.verificarProyectoAbierto(proyecto, "agregar habilidades a perfiles de");

    const [habilidad] = await this.habilidadService.resolverPorCodigos([codigoHabilidad]);

    if (perfil.tieneHabilidadOpcional(habilidad)) {
      throw new ConflictError(`La habilidad "${codigoHabilidad}" ya es opcional en este perfil`);
    }

    if (perfil.tieneHabilidadRequerida(habilidad)) {
      throw new ConflictError(`La habilidad "${codigoHabilidad}" ya es requerida en este perfil`);
    }

    perfil.agregarHabilidadRequerida(habilidad);
    await this.colectivoRepository.guardar(colectivo);
    return perfil;
  }

  async quitarHabilidadRequerida(proyectoId, perfilId, codigoHabilidad) {
    const { colectivo, proyecto, perfil } = await this.buscarPerfilConProyecto(proyectoId, perfilId);
    this.verificarProyectoAbierto(proyecto, "quitar habilidades de perfiles de");

    const habilidad = perfil.habilidadesRequeridas.find((item) => item.codigo === codigoHabilidad);

    if (!habilidad) {
      throw new NotFoundError(`La habilidad "${codigoHabilidad}" no es requerida por el perfil "${perfilId}"`);
    }

    if (perfil.habilidadesRequeridas.length <= 1) {
      throw new DomainError("El perfil debe conservar al menos una habilidad requerida");
    }

    perfil.quitarHabilidadRequerida(habilidad);
    await this.colectivoRepository.guardar(colectivo);
    return perfil;
  }

  async agregarHabilidadOpcional(proyectoId, perfilId, codigoHabilidad) {
    const { colectivo, proyecto, perfil } = await this.buscarPerfilConProyecto(proyectoId, perfilId);
    this.verificarProyectoAbierto(proyecto, "agregar habilidades a perfiles de");

    const [habilidad] = await this.habilidadService.resolverPorCodigos([codigoHabilidad]);

    if (perfil.tieneHabilidadRequerida(habilidad)) {
      throw new ConflictError(`La habilidad "${codigoHabilidad}" ya es requerida en este perfil`);
    }

    if (perfil.tieneHabilidadOpcional(habilidad)) {
      throw new ConflictError(`La habilidad "${codigoHabilidad}" ya es opcional en este perfil`);
    }

    perfil.agregarHabilidadOpcional(habilidad);
    await this.colectivoRepository.guardar(colectivo);
    return perfil;
  }

  async quitarHabilidadOpcional(proyectoId, perfilId, codigoHabilidad) {
    const { colectivo, proyecto, perfil } = await this.buscarPerfilConProyecto(proyectoId, perfilId);
    this.verificarProyectoAbierto(proyecto, "quitar habilidades de perfiles de");

    const habilidad = perfil.habilidadesOpcionales.find((item) => item.codigo === codigoHabilidad);

    if (!habilidad) {
      throw new NotFoundError(`La habilidad "${codigoHabilidad}" no es opcional en el perfil "${perfilId}"`);
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
      throw new DomainError(`Modalidad de colaboración inválida: ${modalidadColaboracion}`);
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

    return new Compromiso(datos);
  }

  async construirPerfil({
    descripcion,
    compromiso,
    modalidadColaboracion,
    codigosHabilidadesRequeridas,
    codigosHabilidadesOpcionales = [],
  }) {
    if (!Array.isArray(codigosHabilidadesRequeridas) || codigosHabilidadesRequeridas.length === 0) {
      throw new DomainError("El perfil debe tener al menos una habilidad requerida");
    }

    if (!Array.isArray(codigosHabilidadesOpcionales)) {
      throw new DomainError("Las habilidades opcionales deben ser una lista");
    }

    const requeridas = [...new Set(codigosHabilidadesRequeridas)];
    const opcionales = [...new Set(codigosHabilidadesOpcionales)];
    const requeridasSet = new Set(requeridas);
    const repetidasEntreListas = opcionales.filter((codigo) => requeridasSet.has(codigo));

    if (repetidasEntreListas.length > 0) {
      throw new DomainError(`Una habilidad no puede ser requerida y opcional al mismo tiempo: ${repetidasEntreListas.join(", ")}`);
    }

    const perfil = new Perfil({
      descripcion,
      compromiso: this.construirCompromiso(compromiso),
      modalidadColaboracion: this.resolverModalidadColaboracion(
        modalidadColaboracion,
      ),
    });

    const habilidadesRequeridas = await this.habilidadService.resolverPorCodigos(requeridas);
    habilidadesRequeridas.forEach((habilidad) => perfil.agregarHabilidadRequerida(habilidad));

    if (opcionales.length > 0) {
      const habilidadesOpcionales = await this.habilidadService.resolverPorCodigos(opcionales);
      habilidadesOpcionales.forEach((habilidad) => perfil.agregarHabilidadOpcional(habilidad));
    }

    return perfil;
  }
}
