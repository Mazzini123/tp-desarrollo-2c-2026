import { bajaDe, detalleDeProyecto, publicacionDe } from "../dto/detalleDeProyecto.js";
import { paginaDeResumenes, resumenDeProyecto } from "../dto/resumenDeProyecto.js";
import { PRIMERA_PAGINA } from "../dto/paginacion.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { notificarResoluciones } from "./soporte/notificarResoluciones.js";
import { createHash } from "node:crypto";
import { DomainError } from "../errors/DomainError.js";
import { ConflictError } from "../errors/ConflictError.js";
import { DuplicadoError } from "../errors/DuplicadoError.js";
import { buscarProyectoOFallar } from "./soporte/buscarOFallar.js";
import { armarPaginado } from "../utils/paginacion.js";
import { normalizarEtiquetas } from "../domain/etiquetas.js";
import { cerrarProyecto } from "./reglasDePostulacion.js";
import { registro } from "../config/registro.js";
import { ESTADOS_PUBLICADOS, PROYECTO_ESTADO } from "../domain/enums/PROYECTO_ESTADO.js";
import { verificarEditable, verificarPublicable } from "./reglasDePublicacion.js";
import { MOTIVO_REVISION } from "../domain/enums/MOTIVO_REVISION.js";
import { aceptacionDeTerminos } from "./reglasDeTerminos.js";

export class ProyectoService {
  constructor({
    proyectoRepository,
    colaboracionRepository,
    colectivoService,
    perfilService,
    notificacionService,
    avisoAutomaticoService,
    revisionRepository,
    terminosService = null,
    transacciones,
  }) {
    this.transacciones = transacciones;
    this.terminosService = terminosService;
    this.revisionRepository = revisionRepository;
    this.colaboracionRepository = colaboracionRepository;
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
      borrador = false,
      terminosAceptados,
      claveIdempotencia,
    },
    ahora = new Date(),
  ) {
    const publicacion = claveIdempotencia && {
      clave: claveIdempotencia,
      huella: createHash("sha256")
        .update(
          JSON.stringify({
            titulo,
            descripcion,
            perfiles,
            etiquetas,
            fechaCierre,
            ...(borrador && { borrador }),
            ...(terminosAceptados !== undefined && { terminosAceptados }),
          }),
        )
        .digest("hex"),
    };

    try {
      return await this.transacciones.ejecutar(async () => {
        const colectivo = await this.colectivoService.buscarPorId(colectivoId, {
          bloquear: true,
        });
        const existente = await this.buscarPublicacion(colectivo._id, publicacion);
        if (existente) return existente;

        this.validarFechaCierre(fechaCierre, ahora);
        if (colectivo.estaDadoDeBaja()) {
          throw new ConflictError(
            "Un colectivo dado de baja no puede publicar proyectos",
          );
        }

        const terminos = aceptacionDeTerminos(
          await this.terminosService?.vigente(),
          terminosAceptados,
          ahora,
        );

        const proyecto = this.proyectoRepository.nuevo({
          colectivoId: colectivo._id,
          datosDelColectivo: datosDelColectivo(colectivo),
          titulo,
          descripcion,
          fechaCierre,
          fechaCreacion: ahora,
          etiquetas: normalizarEtiquetas(etiquetas),
          idempotenciaPublicacion: publicacion,
          estado: borrador ? PROYECTO_ESTADO.BORRADOR : PROYECTO_ESTADO.ABIERTO,
          ...(terminos && { terminos }),
        });

        for (const datos of perfiles) {
          proyecto.agregarPerfil(await this.perfilService.construirPerfil(datos));
        }
        await this.proyectoRepository.guardar(proyecto);
        if (!borrador) await this.avisoAutomaticoService.avisarPorProyectoNuevo(proyecto);
        return proyecto;
      });
    } catch (error) {
      if (publicacion && error instanceof DuplicadoError) {
        const ganador = await this.buscarPublicacion(colectivoId, publicacion);
        if (ganador) return ganador;
      }
      throw error;
    }
  }

  async listar({ numeroPagina = 1, limitePorPagina = 10, ...filtros } = {}) {
    const pagina = { numeroPagina, limitePorPagina };
    return paginaDeResumenes(
      armarPaginado(
        await this.proyectoRepository.listarPaginado(pagina, filtros),
        pagina,
      ),
    );
  }

  async listarDestacados(ahora = new Date()) {
    const proyectos = await this.proyectoRepository.listarDestacadosVigentes(ahora);
    return proyectos.map((proyecto) => resumenDeProyecto(proyecto, ahora));
  }

  async listarResumenesPorColectivo(
    colectivoId,
    { numeroPagina = 1, limitePorPagina = 10, esDueno = false } = {},
  ) {
    await this.colectivoService.buscarPorId(colectivoId);
    const paginado = { numeroPagina, limitePorPagina };
    const pagina = paginaDeResumenes(
      armarPaginado(
        await this.proyectoRepository.listarPorColectivoPaginado(colectivoId, paginado, {
          incluirNoPublicados: esDueno,
        }),
        paginado,
      ),
      esDueno
        ? (proyecto) => ({
            ...resumenDeProyecto(proyecto),
            publicacion: publicacionDe(proyecto),
            baja: bajaDe(proyecto),
          })
        : undefined,
    );
    if (!esDueno) return pagina;

    const pendientes = await this.colaboracionRepository.contarPendientesPorProyecto(
      pagina.items.map((proyecto) => proyecto.id),
    );
    for (const proyecto of pagina.items)
      proyecto.postulacionesPendientes = pendientes.get(proyecto.id) ?? 0;
    pagina.perfilesAbiertos =
      await this.proyectoRepository.contarPerfilesAbiertos(colectivoId);
    return pagina;
  }

  async exigirVisible(proyectoId, lector = {}) {
    const proyecto = await this.proyectoRepository.buscarParaVisibilidad(proyectoId);
    if (!proyecto || !puedeVer(proyecto, lector)) {
      throw new NotFoundError("No existe ese proyecto");
    }
  }

  async verDetalle(proyectoId, lector = {}) {
    const proyecto = await this.proyectoRepository.buscarParaDetalle(proyectoId);
    if (!proyecto || !puedeVer(proyecto, lector)) {
      throw new NotFoundError("No existe ese proyecto");
    }
    const esDueno = esDelColectivo(proyecto, lector);
    const publicado = ESTADOS_PUBLICADOS.includes(proyecto.estado);
    if (!esDueno && publicado) {
      try {
        const cantidad = await this.proyectoRepository.registrarVisualizacion(proyectoId);
        if (cantidad !== undefined) proyecto.visualizaciones = cantidad;
      } catch (error) {
        registro.error("visualizacion_no_registrada", {
          proyectoId,
          error: error.message,
        });
      }
    }
    const pagina = await this.colaboracionRepository.listarDeProyecto(
      proyectoId,
      PRIMERA_PAGINA,
      { privadas: esDueno },
    );
    const aceptadas =
      await this.colaboracionRepository.contarAceptadasPorPerfil(proyectoId);
    const respuesta = detalleDeProyecto(proyecto, pagina, aceptadas, esDueno, {
      conDatosDeGestion: esDueno || Boolean(lector.esAdministracion),
    });
    return { proyecto: respuesta, esDueno };
  }

  async buscarPorId(proyectoId) {
    return buscarProyectoOFallar(this.proyectoRepository, proyectoId);
  }

  async colectivoIdDe(proyectoId) {
    const colectivoId = await this.proyectoRepository.buscarColectivoId(proyectoId);
    if (!colectivoId)
      throw new NotFoundError(`No existe un proyecto con id "${proyectoId}"`);
    return String(colectivoId);
  }

  async colaboradorIdDe(proyectoId, colaboracionId) {
    await this.colectivoIdDe(proyectoId);
    const colaboracion = await this.colaboracionRepository.buscarEnProyecto(
      proyectoId,
      colaboracionId,
    );
    return colaboracion ? String(colaboracion.colaborador) : null;
  }

  verificarAbierto(proyecto, accion) {
    if (!proyecto.estaAbierto()) {
      throw new ConflictError(`No se puede ${accion} un proyecto que no está abierto`);
    }
  }

  async actualizar(
    proyectoId,
    { titulo, descripcion, etiquetas, fechaCierre },
    ahora = new Date(),
  ) {
    const proyecto = await this.buscarPorId(proyectoId);
    verificarEditable(proyecto, "modificar");

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

  async pedirPublicacion(proyectoId, ahora = new Date()) {
    return this.transacciones.ejecutar(async () => {
      const proyecto = await this.buscarPorId(proyectoId);
      if (!proyecto.esBorrador()) {
        throw new ConflictError("Solo se puede pedir la publicación de un borrador");
      }
      verificarPublicable(proyecto, ahora);
      const revision = await this.revisionRepository.crearPendiente({
        proyectoId: proyecto._id,
        motivo: MOTIVO_REVISION.PUBLICACION,
        creadaEn: ahora,
      });
      if (!revision) {
        throw new ConflictError("La publicación de este proyecto ya está pedida");
      }
      proyecto.pedirPublicacion(revision._id, ahora);
      await this.proyectoRepository.guardar(proyecto);
      return proyecto;
    });
  }

  async finalizar(proyectoId, ahora = new Date()) {
    return this.transacciones.ejecutar(async () => {
      const proyecto = await this.buscarPorId(proyectoId);
      this.verificarAbierto(proyecto, "finalizar");
      return this.guardarCierre(proyecto, ahora);
    });
  }

  async cerrar(proyecto, ahora) {
    return this.transacciones.ejecutar(async () => {
      const actual = await this.buscarPorId(proyecto.id);
      if (!actual.estaAbierto()) return actual;
      return this.guardarCierre(actual, ahora);
    });
  }

  async guardarCierre(proyecto, ahora) {
    const cambios = cerrarProyecto(proyecto, ahora);
    await this.proyectoRepository.guardar(proyecto);
    await notificarResoluciones(this.notificacionService, proyecto, cambios);
    return proyecto;
  }

  async cerrarVencidos(ahora = new Date(), { debeDetenerse = () => false } = {}) {
    const vencidos = await this.proyectoRepository.buscarConCierreVencido(ahora);
    const cerrados = [];

    for (const proyecto of vencidos) {
      if (debeDetenerse()) break;
      try {
        cerrados.push(await this.cerrar(proyecto, ahora));
      } catch (error) {
        registro.error("cierre_automatico_fallido", {
          proyectoId: proyecto.id,
          error: error.message,
        });
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

function esDelColectivo(proyecto, { colectivoId = null } = {}) {
  return colectivoId !== null && colectivoId === String(proyecto.colectivoId);
}

function puedeVer(proyecto, lector) {
  return (
    ESTADOS_PUBLICADOS.includes(proyecto.estado) ||
    esDelColectivo(proyecto, lector) ||
    Boolean(lector.esAdministracion)
  );
}
