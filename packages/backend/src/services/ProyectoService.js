import { Proyecto } from "../domain/Proyecto.js";
import { DomainError } from "../errors/DomainError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { ConflictError } from "../errors/ConflictError.js";
import { armarPaginado } from "../utils/paginacion.js";
import { normalizarEtiquetas } from "../domain/etiquetas.js";
import { MODO_ACEPTACION } from "../domain/enums/MODO_ACEPTACION.js";
import {
  aplicarModoDeAceptacion,
  cerrarProyecto,
  notificarResoluciones,
  validarModoDeAceptacion,
} from "./reglasDePostulacion.js";

export class ProyectoService {
  constructor({
    colectivoRepository,
    colectivoService,
    perfilService,
    notificacionService,
    avisoAutomaticoService,
  }) {
    this.colectivoRepository = colectivoRepository;
    this.colectivoService = colectivoService;
    this.perfilService = perfilService;
    this.notificacionService = notificacionService;
    this.avisoAutomaticoService = avisoAutomaticoService;
  }

  async crear({
    colectivoId,
    titulo,
    descripcion,
    perfiles,
    etiquetas = [],
    modoAceptacion = MODO_ACEPTACION.TODO_SUMA,
    limiteVacantes = null,
    fechaCierre = null,
  }, ahora = new Date()) {
    if (!Array.isArray(perfiles) || perfiles.length === 0) {
      throw new DomainError("El proyecto debe tener al menos un perfil");
    }

    validarModoDeAceptacion(modoAceptacion, limiteVacantes);
    this.validarFechaCierre(fechaCierre, ahora);

    const colectivo = await this.colectivoService.buscarPorId(colectivoId);
    if (colectivo.estaDadoDeBaja()) {
      throw new ConflictError("Un colectivo dado de baja no puede publicar proyectos");
    }
    // construirPerfil es async (resuelve habilidades): Promise.all espera a todos.
    const perfilesConstruidos = await Promise.all(
      perfiles.map((datos) => this.perfilService.construirPerfil(datos)),
    );
    const proyecto = new Proyecto({
      titulo,
      descripcion,
      modoAceptacion,
      limiteVacantes,
      fechaCierre,
      fechaCreacion: ahora,
    });
    proyecto.etiquetas = normalizarEtiquetas(etiquetas);

    perfilesConstruidos.forEach((perfil) => proyecto.agregarPerfil(perfil));
    colectivo.agregarProyecto(proyecto);
    await this.colectivoRepository.guardar(colectivo);

    // Req. adicional 9. Si los avisos fallan, el proyecto igual quedo creado.
    try {
      await this.avisoAutomaticoService.avisarPorProyectoNuevo(proyecto);
    } catch (error) {
      console.error("No se pudieron enviar los avisos automaticos:", error.message);
    }

    return proyecto;
  }

  async listar({ numeroPagina = 1, limitePorPagina = 10, etiqueta } = {}) {
    return armarPaginado(
      await this.colectivoRepository.listarProyectosPaginado(numeroPagina, limitePorPagina, {
        etiqueta,
      }),
      numeroPagina,
      limitePorPagina,
    );
  }

  async listarPorColectivo(colectivoId) {
    return (await this.colectivoService.buscarPorId(colectivoId)).proyectos;
  }

  async buscarProyectoConColectivo(proyectoId) {
    const resultado = await this.colectivoRepository.buscarProyecto(proyectoId);

    if (!resultado) {
      throw new NotFoundError(`No existe un proyecto con id "${proyectoId}"`);
    }

    return resultado;
  }

  // GET /proyectos/:id: la consulta de una persona cuenta como visualizacion
  // (req. adicional 17). Los usos internos de buscarPorId no suman.
  async verDetalle(proyectoId) {
    try {
      await this.colectivoRepository.registrarVisualizacion(proyectoId);
    } catch (error) {
      // Un contador que no se pudo sumar no puede impedir ver el proyecto.
      console.error("No se pudo registrar la visualizacion:", error.message);
    }
    return this.buscarPorId(proyectoId);
  }

  async buscarPorId(proyectoId) {
    return (await this.buscarProyectoConColectivo(proyectoId)).proyecto;
  }

  verificarAbierto(proyecto, accion) {
    if (!proyecto.estaAbierto()) {
      throw new ConflictError(`No se puede ${accion} un proyecto finalizado`);
    }
  }

  async actualizar(
    proyectoId,
    { titulo, descripcion, etiquetas, modoAceptacion, limiteVacantes, fechaCierre },
    ahora = new Date(),
  ) {
    const { colectivo, proyecto } = await this.buscarProyectoConColectivo(proyectoId);
    this.verificarAbierto(proyecto, "modificar");

    if (titulo !== undefined) {
      proyecto.titulo = titulo;
    }

    if (descripcion !== undefined) {
      proyecto.descripcion = descripcion;
    }

    if (etiquetas !== undefined) {
      proyecto.etiquetas = normalizarEtiquetas(etiquetas);
    }

    // "En cualquier momento el colectivo podra indicar una fecha limite de
    // cierre". null la saca.
    if (fechaCierre !== undefined) {
      this.validarFechaCierre(fechaCierre, ahora);
      proyecto.fechaCierre = fechaCierre;
    }

    let cambios = { aceptadas: [], rechazadas: [] };
    if (modoAceptacion !== undefined || limiteVacantes !== undefined) {
      const nuevoModo = modoAceptacion ?? proyecto.modoAceptacion;
      const nuevoLimite = limiteVacantes !== undefined ? limiteVacantes : proyecto.limiteVacantes;
      validarModoDeAceptacion(nuevoModo, nuevoLimite, proyecto.cantidadAceptadas());

      proyecto.modoAceptacion = nuevoModo;
      proyecto.limiteVacantes = nuevoLimite;
      // Con las reglas nuevas se resuelven las pendientes que ya habia (por
      // ejemplo, pasar a TODO_SUMA acepta a todas).
      cambios = aplicarModoDeAceptacion(proyecto, ahora);
    }

    await this.colectivoRepository.guardar(colectivo);
    await notificarResoluciones(this.notificacionService, proyecto, cambios);
    return proyecto;
  }

  async finalizar(proyectoId, ahora = new Date()) {
    const { colectivo, proyecto } = await this.buscarProyectoConColectivo(proyectoId);
    this.verificarAbierto(proyecto, "finalizar");

    await this.cerrar(colectivo, [proyecto], ahora);
    return proyecto;
  }

  // Cierre con todas sus consecuencias. Lo usan el cierre manual, el
  // automatico y cualquier operacion que descubra un cierre vencido.
  async cerrar(colectivo, proyectos, ahora) {
    const cambios = proyectos.map((proyecto) => [proyecto, cerrarProyecto(proyecto, ahora)]);
    await this.colectivoRepository.guardar(colectivo);

    for (const [proyecto, cambiosDelProyecto] of cambios) {
      await notificarResoluciones(this.notificacionService, proyecto, cambiosDelProyecto);
    }
  }

  // Requerimiento adicional 10. Lo llama periodicamente el job de
  // jobs/cierreAutomatico.js. Devuelve los proyectos que cerro.
  async cerrarVencidos(ahora = new Date()) {
    const colectivos = await this.colectivoRepository.buscarConCierreVencido(ahora);
    const cerrados = [];

    for (const colectivo of colectivos) {
      const vencidos = colectivo.proyectos.filter((p) => p.cierreVencido(ahora));
      if (vencidos.length === 0) continue;
      await this.cerrar(colectivo, vencidos, ahora);
      cerrados.push(...vencidos);
    }

    return cerrados;
  }

  validarFechaCierre(fechaCierre, ahora) {
    if (fechaCierre !== null && fechaCierre !== undefined && fechaCierre <= ahora) {
      throw new DomainError("La fecha de cierre tiene que ser futura");
    }
  }
}
