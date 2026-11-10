import { createHash } from "node:crypto";
import { DomainError } from "../errors/DomainError.js";
import { ConflictError } from "../errors/ConflictError.js";
import { DuplicadoError } from "../errors/DuplicadoError.js";
import { buscarProyectoOFallar } from "./soporte/buscarOFallar.js";
import { armarPaginado } from "../utils/paginacion.js";
import { normalizarEtiquetas } from "../domain/etiquetas.js";
import { cerrarProyecto, notificarResoluciones } from "./reglasDePostulacion.js";

export class ProyectoService {
  constructor({
    proyectoRepository,
    colectivoService,
    perfilService,
    notificacionService,
    avisoAutomaticoService,
    transacciones,
  }) {
    this.transacciones = transacciones;
    this.proyectoRepository = proyectoRepository;
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
    const publicacion = claveIdempotencia && {
      clave: claveIdempotencia,
      huella: createHash("sha256")
        .update(JSON.stringify({ titulo, descripcion, perfiles, etiquetas, fechaCierre }))
        .digest("hex"),
    };

    const resolverPublicacion = () =>
      this.transacciones.ejecutar(async () => {
        // La baja usa el mismo documento antes de buscar sus proyectos abiertos.
        const colectivo = await this.colectivoService.buscarPorId(colectivoId, {
          bloquear: true,
        });
        const existente = await this.buscarPublicacion(colectivo._id, publicacion);
        if (existente) return { proyecto: existente, creado: false };

        this.validarFechaCierre(fechaCierre, ahora);
        if (colectivo.estaDadoDeBaja()) {
          throw new ConflictError(
            "Un colectivo dado de baja no puede publicar proyectos",
          );
        }

        const proyecto = this.proyectoRepository.nuevo({
          colectivoId: colectivo._id,
          datosDelColectivo: datosDelColectivo(colectivo),
          titulo,
          descripcion,
          fechaCierre,
          fechaCreacion: ahora,
          etiquetas: normalizarEtiquetas(etiquetas),
          idempotenciaPublicacion: publicacion,
        });

        for (const datos of perfiles) {
          proyecto.agregarPerfil(await this.perfilService.construirPerfil(datos));
        }
        await this.proyectoRepository.guardar(proyecto);
        return { proyecto, creado: true };
      });

    let resultado;
    try {
      resultado = await resolverPublicacion();
    } catch (error) {
      if (publicacion && error instanceof DuplicadoError) {
        const ganador = await this.buscarPublicacion(colectivoId, publicacion);
        if (ganador) return ganador;
      }
      throw error;
    }
    const { proyecto, creado } = resultado;
    if (!creado) return proyecto;

    try {
      await this.avisoAutomaticoService.avisarPorProyectoNuevo(proyecto);
    } catch (error) {
      console.error("No se pudieron enviar los avisos automaticos:", error.message);
    }

    return proyecto;
  }

  async listar({ numeroPagina = 1, limitePorPagina = 10, ...filtros } = {}) {
    return armarPaginado(
      await this.proyectoRepository.listarPaginado(
        numeroPagina,
        limitePorPagina,
        filtros,
      ),
      numeroPagina,
      limitePorPagina,
    );
  }

  async listarPorColectivo(colectivoId) {
    await this.colectivoService.buscarPorId(colectivoId);
    return this.proyectoRepository.buscarPorColectivo(colectivoId);
  }

  async verDetalle(proyectoId, colectivoIdDeQuienConsulta = null) {
    const proyecto = await this.buscarPorId(proyectoId);
    const esDueno = colectivoIdDeQuienConsulta === String(proyecto.colectivoId);

    if (esDueno) {
      return { proyecto, esDueno };
    }
    try {
      await this.proyectoRepository.registrarVisualizacion(proyectoId);
    } catch (error) {
      console.error("No se pudo registrar la visualizacion:", error.message);
    }
    return { proyecto: await this.buscarPorId(proyectoId), esDueno };
  }

  async buscarPorId(proyectoId) {
    return buscarProyectoOFallar(this.proyectoRepository, proyectoId);
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
    const proyecto = await this.buscarPorId(proyectoId);
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

    await this.proyectoRepository.guardar(proyecto);
    return proyecto;
  }

  async finalizar(proyectoId, ahora = new Date()) {
    const proyecto = await this.buscarPorId(proyectoId);
    this.verificarAbierto(proyecto, "finalizar");

    await this.cerrar(proyecto, ahora);
    return proyecto;
  }

  async cerrar(proyecto, ahora, opcionesDeNotificacion) {
    const cambios = cerrarProyecto(proyecto, ahora);
    await this.proyectoRepository.guardar(proyecto);
    await notificarResoluciones(
      this.notificacionService,
      proyecto,
      cambios,
      opcionesDeNotificacion,
    );
  }

  async cerrarVencidos(ahora = new Date()) {
    const vencidos = await this.proyectoRepository.buscarConCierreVencido(ahora);
    const cerrados = [];

    for (const proyecto of vencidos) {
      try {
        await this.cerrar(proyecto, ahora);
        cerrados.push(proyecto);
      } catch (error) {
        console.error(
          `Cierre automatico: no se pudo cerrar el proyecto ${proyecto.id}:`,
          error.message,
        );
      }
    }

    return cerrados;
  }

  async buscarPublicacion(colectivoId, publicacion) {
    if (!publicacion) return null;
    const proyecto = await this.proyectoRepository.buscarPorClaveDePublicacion(
      colectivoId,
      publicacion.clave,
    );
    if (proyecto && proyecto.idempotenciaPublicacion.huella !== publicacion.huella) {
      throw new ConflictError("La clave de publicacion ya se uso con otros datos");
    }
    return proyecto;
  }

  validarFechaCierre(fechaCierre, ahora) {
    if (fechaCierre !== null && fechaCierre !== undefined && fechaCierre <= ahora) {
      throw new DomainError("La fecha de cierre tiene que ser futura");
    }
  }
}

export function datosDelColectivo(colectivo) {
  return {
    nombre: colectivo.nombre,
    tipoColectivo: colectivo.tipoColectivo,
    ubicacion: colectivo.ubicacion ?? null,
  };
}
