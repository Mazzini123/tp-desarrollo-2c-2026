import { Proyecto } from "../domain/Proyecto.js";
import { Compromiso } from "../domain/Compromiso.js";
import { DomainError } from "../errors/DomainError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { ConflictError } from "../errors/ConflictError.js";
import { esPeriodoCompromisoValido } from "../domain/enums/PeriodoCompromiso.js";
import {
  MODALIDAD_COLABORACION,
  esModalidadColaboracionValida,
} from "../domain/enums/ModalidadColaboracion.js";
import { armarPaginado } from "../utils/paginacion.js";

export class ProyectoService {
  constructor({ colectivoRepository, colectivoService, habilidadService }) {
    this.colectivoRepository = colectivoRepository;
    this.colectivoService = colectivoService;
    this.habilidadService = habilidadService;
  }

  crear({
    colectivoId,
    titulo,
    descripcion,
    compromisoEsperado,
    modalidadColaboracion,
    habilidadesNecesarias,
  }) {
    if (!Array.isArray(habilidadesNecesarias) || habilidadesNecesarias.length === 0) {
      throw new DomainError("El proyecto debe necesitar al menos una habilidad");
    }

    const colectivo = this.colectivoService.buscarPorId(colectivoId);
    const habilidades = this.habilidadService.resolverPorCodigos(habilidadesNecesarias);

    const proyecto = new Proyecto({
      titulo,
      descripcion,
      compromisoEsperado: this.construirCompromiso(compromisoEsperado),
      modalidadColaboracion: this.resolverModalidadColaboracion(modalidadColaboracion),
      habilidadesNecesarias: habilidades,
    });

    colectivo.agregarProyecto(proyecto);
    this.colectivoRepository.guardar(colectivo);

    return proyecto;
  }

  listar({ numeroPagina = 1, limitePorPagina = 10 } = {}) {
    return armarPaginado(
      this.colectivoRepository.listarProyectosPaginado(numeroPagina, limitePorPagina),
      numeroPagina,
      limitePorPagina,
    );
  }

  listarPorColectivo(colectivoId) {
    return this.colectivoService.buscarPorId(colectivoId).proyectos;
  }

  buscarProyectoConColectivo(proyectoId) {
    const resultado = this.colectivoRepository.buscarProyecto(proyectoId);
    if (!resultado) {
      throw new NotFoundError(`No existe un proyecto con id "${proyectoId}"`);
    }
    return resultado;
  }

  buscarPorId(proyectoId) {
    return this.buscarProyectoConColectivo(proyectoId).proyecto;
  }

  verificarAbierto(proyecto, accion) {
    if (!proyecto.estaAbierto()) {
      throw new ConflictError(`No se puede ${accion} un proyecto finalizado`);
    }
  }

  actualizar(proyectoId, { titulo, descripcion }) {
    const { colectivo, proyecto } = this.buscarProyectoConColectivo(proyectoId);
    this.verificarAbierto(proyecto, "modificar");

    if (titulo !== undefined) {
      proyecto.titulo = titulo.trim();
    }
    if (descripcion !== undefined) {
      proyecto.descripcion = descripcion.trim();
    }

    this.colectivoRepository.guardar(colectivo);
    return proyecto;
  }

  agregarHabilidadRequerida(proyectoId, codigoHabilidad) {
    const { colectivo, proyecto } = this.buscarProyectoConColectivo(proyectoId);
    this.verificarAbierto(proyecto, "agregar habilidades a");

    const [habilidad] = this.habilidadService.resolverPorCodigos([codigoHabilidad]);
    proyecto.agregarHabilidadRequerida(habilidad);
    this.colectivoRepository.guardar(colectivo);
    return proyecto;
  }

  quitarHabilidadRequerida(proyectoId, codigoHabilidad) {
    const { colectivo, proyecto } = this.buscarProyectoConColectivo(proyectoId);
    this.verificarAbierto(proyecto, "quitar habilidades de");

    if (proyecto.habilidadesNecesarias.length <= 1) {
      throw new DomainError("El proyecto debe conservar al menos una habilidad necesaria");
    }

    const [habilidad] = this.habilidadService.resolverPorCodigos([codigoHabilidad]);
    proyecto.quitarHabilidadRequerida(habilidad);
    this.colectivoRepository.guardar(colectivo);
    return proyecto;
  }

  finalizar(proyectoId) {
    const { colectivo, proyecto } = this.buscarProyectoConColectivo(proyectoId);
    this.verificarAbierto(proyecto, "finalizar");

    proyecto.finalizarProyecto();
    this.colectivoRepository.guardar(colectivo);
    return proyecto;
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

    return new Compromiso(datos);
  }
}
