import { createHash } from "node:crypto";
import mongoose from "mongoose";
import { DomainError } from "../errors/DomainError.js";
import { ROL_CUENTA } from "../domain/enums/ROL_CUENTA.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { ConflictError } from "../errors/ConflictError.js";
import { armarPaginado } from "../utils/paginacion.js";
import { normalizarEtiquetas } from "../domain/etiquetas.js";
import { cerrarProyecto, notificarResoluciones } from "./reglasDePostulacion.js";

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

  async crear(
    {
      colectivoId,
      titulo,
      descripcion,
      perfiles,
      etiquetas = [],
      fechaCierre = null,
      claveIdempotencia,
    },
    ahora = new Date(),
  ) {
    if (!Array.isArray(perfiles) || perfiles.length === 0) {
      throw new DomainError("El proyecto debe tener al menos un perfil");
    }

    const publicacion = claveIdempotencia && {
      clave: claveIdempotencia,
      huella: createHash("sha256")
        .update(JSON.stringify({ titulo, descripcion, perfiles, etiquetas, fechaCierre }))
        .digest("hex"),
    };

    const colectivo = await this.colectivoService.buscarPorId(colectivoId);
    const existente = buscarPublicacion(colectivo, publicacion);
    if (existente) return existente;

    this.validarFechaCierre(fechaCierre, ahora);
    if (colectivo.estaDadoDeBaja()) {
      throw new ConflictError("Un colectivo dado de baja no puede publicar proyectos");
    }

    const perfilesConstruidos = await Promise.all(
      perfiles.map((datos) => this.perfilService.construirPerfil(datos)),
    );

    const creadaMientras = buscarPublicacion(colectivo, publicacion);
    if (creadaMientras) return creadaMientras;

    const proyecto = colectivo.agregarProyecto({
      titulo,
      descripcion,
      fechaCierre,
      fechaCreacion: ahora,
      etiquetas: normalizarEtiquetas(etiquetas),
      idempotenciaPublicacion: publicacion,
    });

    perfilesConstruidos.forEach((perfil) => proyecto.agregarPerfil(perfil));
    try {
      await this.colectivoRepository.guardar(colectivo);
    } catch (error) {
      if (publicacion && error instanceof mongoose.Error.VersionError) {
        const actualizado = await this.colectivoService.buscarPorId(colectivoId);
        const ganador = buscarPublicacion(actualizado, publicacion);
        if (ganador) return ganador;
      }
      throw error;
    }

    // Req. adicional 9. Si los avisos fallan, el proyecto igual quedo creado.
    try {
      await this.avisoAutomaticoService.avisarPorProyectoNuevo(proyecto);
    } catch (error) {
      console.error("No se pudieron enviar los avisos automaticos:", error.message);
    }

    return proyecto;
  }

  async listar({ numeroPagina = 1, limitePorPagina = 10, ...filtros } = {}) {
    return armarPaginado(
      await this.colectivoRepository.listarProyectosPaginado(
        numeroPagina,
        limitePorPagina,
        filtros,
      ),
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
  async verDetalle(proyectoId, cuenta = null) {
    const { colectivo } = await this.buscarProyectoConColectivo(proyectoId);
    const esDueno =
      cuenta?.rol === ROL_CUENTA.COLECTIVO && String(cuenta.perfilId) === String(colectivo.id);

    if (!esDueno) {
      try {
        await this.colectivoRepository.registrarVisualizacion(proyectoId);
      } catch (error) {
        console.error("No se pudo registrar la visualizacion:", error.message);
      }
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
    { titulo, descripcion, etiquetas, fechaCierre },
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

    if (fechaCierre !== undefined) {
      this.validarFechaCierre(fechaCierre, ahora);
      proyecto.fechaCierre = fechaCierre;
    }

    await this.colectivoRepository.guardar(colectivo);
    return proyecto;
  }

  async finalizar(proyectoId, ahora = new Date()) {
    const { colectivo, proyecto } = await this.buscarProyectoConColectivo(proyectoId);
    this.verificarAbierto(proyecto, "finalizar");

    await this.cerrar(colectivo, [proyecto], ahora);
    return proyecto;
  }

  async cerrar(colectivo, proyectos, ahora) {
    const cambios = proyectos.map((proyecto) => [
      proyecto,
      cerrarProyecto(proyecto, ahora),
    ]);
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

function buscarPublicacion(colectivo, publicacion) {
  if (!publicacion) return null;
  const proyecto = colectivo.proyectos.find(
    ({ idempotenciaPublicacion }) => idempotenciaPublicacion?.clave === publicacion.clave,
  );
  if (proyecto && proyecto.idempotenciaPublicacion.huella !== publicacion.huella) {
    throw new ConflictError("La clave de publicacion ya se uso con otros datos");
  }
  return proyecto;
}
