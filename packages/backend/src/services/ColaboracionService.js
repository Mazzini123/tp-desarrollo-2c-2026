import { armarPaginado } from "../utils/paginacion.js";
import { notificarResoluciones } from "./soporte/notificarResoluciones.js";
import { proyectosPorId } from "./soporte/proyectosPorId.js";
import { DomainError } from "../errors/DomainError.js";
import { ConflictError } from "../errors/ConflictError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { ForbiddenError } from "../errors/ForbiddenError.js";
import { TIPO_NOTIFICACION } from "../domain/enums/TIPO_NOTIFICACION.js";
import {
  aplicarModoDeAceptacion,
  puedeVerContactoDe,
  yaSePostuloAlPerfil,
} from "./reglasDePostulacion.js";
import {
  cierreVencido,
  cumpleHabilidadesRequeridas,
  perfilAceptaPostulaciones,
} from "./reglasDeBusqueda.js";

export class ColaboracionService {
  constructor({
    proyectoRepository,
    colaboracionRepository,
    colectivoService,
    proyectoService,
    colaboradorService,
    notificacionService,
    transacciones,
  }) {
    this.transacciones = transacciones;
    this.proyectoRepository = proyectoRepository;
    this.colaboracionRepository = colaboracionRepository;
    this.colectivoService = colectivoService;
    this.proyectoService = proyectoService;
    this.colaboradorService = colaboradorService;
    this.notificacionService = notificacionService;
  }

  async registrar(
    { proyectoId, perfilId, colaboradorId, esPublica = true },
    ahora = new Date(),
  ) {
    const resultado = await this.transacciones.ejecutar(async () => {
      const colaborador = await this.colaboradorService.buscarPorId(colaboradorId, {
        bloquear: true,
      });
      this.colaboradorService.exigirActiva(colaborador);
      const proyecto = await this.proyectoService.buscarPorId(proyectoId);

      if (cierreVencido(proyecto, ahora)) {
        await this.proyectoService.cerrar(proyecto, ahora);
        return null;
      }
      if (!proyecto.estaAbierto()) {
        throw new ConflictError(
          "No se puede anotar a un proyecto que ya está finalizado",
        );
      }

      const perfil = proyecto.buscarPerfil(perfilId);
      if (!perfil) {
        throw new NotFoundError(
          `No existe el perfil "${perfilId}" en el proyecto "${proyectoId}"`,
        );
      }
      if (!perfilAceptaPostulaciones(perfil, ahora)) {
        throw new ConflictError("La búsqueda de este perfil está cerrada");
      }
      if (!cumpleHabilidadesRequeridas(perfil, colaborador)) {
        throw new DomainError(
          "El colaborador debe cumplir todas las habilidades requeridas del perfil",
        );
      }
      if (yaSePostuloAlPerfil(proyecto, colaborador, perfil)) {
        throw new ConflictError("El colaborador ya está anotado en este perfil");
      }

      const colaboracion = proyecto.agregarColaboracion(
        this.proyectoRepository.nuevaColaboracion(proyecto, {
          colaborador,
          perfil: perfil.id,
          esPublica,
          fecha: ahora,
        }),
      );
      const cambios = aplicarModoDeAceptacion(proyecto, perfil, ahora);
      await this.proyectoRepository.guardar(proyecto);
      await notificarResoluciones(this.notificacionService, proyecto, {
        aceptadas: cambios.aceptadas.filter((c) => c !== colaboracion),
        rechazadas: cambios.rechazadas.filter((c) => c !== colaboracion),
      });
      return colaboracion;
    });

    if (!resultado) {
      throw new ConflictError("No se puede anotar a un proyecto que ya está finalizado");
    }

    return resultado;
  }

  async buscarColaboracion(proyectoId, colaboracionId) {
    const proyecto = await this.proyectoService.buscarPorId(proyectoId);
    const colaboracion = proyecto.buscarColaboracion(colaboracionId);

    if (!colaboracion) {
      throw new NotFoundError(
        `No existe la colaboracion "${colaboracionId}" en el proyecto "${proyectoId}"`,
      );
    }

    return { proyecto, colaboracion };
  }

  async aceptar(proyectoId, colaboracionId, ahora = new Date()) {
    const resultado = await this.transacciones.ejecutar(async () => {
      const { proyecto, colaboracion } = await this.buscarColaboracion(
        proyectoId,
        colaboracionId,
      );

      if (cierreVencido(proyecto, ahora)) {
        await this.proyectoService.cerrar(proyecto, ahora);
        return null;
      }

      this.verificarPendiente(proyecto, colaboracion, "aceptar");

      const perfil = proyecto.buscarPerfil(colaboracion.perfil);
      if (!perfil) throw new ConflictError("El perfil de la postulación ya no existe");

      if (perfil.limiteAlcanzado(proyecto.cantidadAceptadas(perfil))) {
        throw new ConflictError("El perfil ya alcanzó su límite de colaboraciones");
      }

      colaboracion.aceptar(ahora);

      const cambios = aplicarModoDeAceptacion(proyecto, perfil, ahora);
      await this.proyectoRepository.guardar(proyecto);

      await notificarResoluciones(this.notificacionService, proyecto, {
        aceptadas: [colaboracion, ...cambios.aceptadas],
        rechazadas: cambios.rechazadas,
      });

      return colaboracion;
    });
    if (!resultado)
      throw new ConflictError(
        "No se puede aceptar una postulación de un proyecto vencido",
      );
    return resultado;
  }

  async rechazar(proyectoId, colaboracionId, ahora = new Date()) {
    return this.transacciones.ejecutar(async () => {
      const { proyecto, colaboracion } = await this.buscarColaboracion(
        proyectoId,
        colaboracionId,
      );

      this.verificarPendiente(proyecto, colaboracion, "rechazar");

      colaboracion.rechazar(ahora);
      await this.proyectoRepository.guardar(proyecto);

      await notificarResoluciones(this.notificacionService, proyecto, {
        aceptadas: [],
        rechazadas: [colaboracion],
      });

      return colaboracion;
    });
  }

  async finalizar(proyectoId, colaboracionId, ahora = new Date()) {
    return this.transacciones.ejecutar(async () => {
      const { proyecto, colaboracion } = await this.buscarColaboracion(
        proyectoId,
        colaboracionId,
      );

      if (!colaboracion.estaAceptada()) {
        throw new ConflictError(
          `Solo se puede finalizar una colaboracion aceptada (esta esta ${colaboracion.estado})`,
        );
      }

      colaboracion.finalizar(ahora);
      await this.proyectoRepository.guardar(proyecto);
      await notificarResoluciones(this.notificacionService, proyecto, {
        finalizadas: [colaboracion],
      });

      return colaboracion;
    });
  }

  async desvincular(
    proyectoId,
    colaboracionId,
    { porLaColaboradora = false, ahora = new Date() } = {},
  ) {
    return this.transacciones.ejecutar(async () => {
      const { proyecto, colaboracion } = await this.buscarColaboracion(
        proyectoId,
        colaboracionId,
      );

      if (!colaboracion.estaAceptada()) {
        throw new ConflictError(
          `Solo se puede desvincular una colaboracion aceptada (esta esta ${colaboracion.estado})`,
        );
      }

      colaboracion.desvincular(ahora);
      await this.proyectoRepository.guardar(proyecto);
      if (!porLaColaboradora) {
        await this.notificarDesvinculacion(proyectoId, colaboracion);
      }

      return colaboracion;
    });
  }

  async retirar(proyectoId, colaboracionId, ahora = new Date()) {
    const { proyecto, colaboracion } = await this.buscarColaboracion(
      proyectoId,
      colaboracionId,
    );

    if (!colaboracion.estaPendiente()) {
      throw new ConflictError(
        `Solo se puede retirar una postulacion pendiente (esta esta ${colaboracion.estado})`,
      );
    }

    colaboracion.retirar(ahora);
    await this.proyectoRepository.guardar(proyecto);

    return colaboracion;
  }

  async datosDeContacto(proyectoId, colaboradorId) {
    const proyecto = await this.proyectoService.buscarPorId(proyectoId);
    const colaborador = await this.colaboradorService.buscarPorId(colaboradorId);

    if (!puedeVerContactoDe(proyecto, colaborador)) {
      throw new ForbiddenError(
        "Los datos de contacto solo se comparten con una postulacion aceptada",
      );
    }

    return colaborador.mediosDeContacto.map(({ tipo, valor }) => ({ tipo, valor }));
  }

  async notificarDesvinculacion(proyectoId, colaboracion) {
    return this.notificacionService.notificar(colaboracion.colaborador, {
      tipo: TIPO_NOTIFICACION.DESVINCULACION,
      asunto: "Ya no formás parte de un proyecto",
      contenido: "Tu colaboración en el proyecto terminó por una desvinculación.",
      referencias: { proyectoId, colaboracionId: colaboracion.id },
    });
  }

  async proyectosDe(colaboraciones) {
    return proyectosPorId(colaboraciones, (ids) =>
      this.proyectoRepository.buscarVarios(ids),
    );
  }

  verificarPendiente(proyecto, colaboracion, accion) {
    if (!proyecto.estaAbierto()) {
      throw new ConflictError(
        `No se puede ${accion} una postulacion de un proyecto finalizado`,
      );
    }
    if (!colaboracion.estaPendiente()) {
      throw new ConflictError(
        `Solo se puede ${accion} una postulacion pendiente (esta esta ${colaboracion.estado})`,
      );
    }
  }

  async listarPendientesDeColectivo(
    colectivoId,
    { numeroPagina = 1, limitePorPagina = 20 } = {},
  ) {
    await this.colectivoService.buscarPorId(colectivoId);
    const paginado = { numeroPagina, limitePorPagina };
    const pagina = await this.colaboracionRepository.pendientesDeColectivo(
      colectivoId,
      paginado,
    );
    const proyectos = await this.proyectosDe(pagina.items);
    return armarPaginado(
      {
        total: pagina.total,
        items: pagina.items.map((colaboracion) => {
          const proyecto = proyectos.get(String(colaboracion.proyectoId));
          return {
            proyecto: {
              id: proyecto.id,
              titulo: proyecto.titulo,
              estado: proyecto.estado,
            },
            perfil: resumirPerfil(proyecto.buscarPerfil(colaboracion.perfil)),
            colaboracion,
          };
        }),
      },
      paginado,
    );
  }

  async listarPaginaPorProyecto(
    proyectoId,
    { numeroPagina = 1, limitePorPagina = 20, privadas = false, estado } = {},
  ) {
    if (!(await this.proyectoRepository.buscarSinColaboraciones(proyectoId)))
      throw new NotFoundError("No existe ese proyecto");
    const pagina = { numeroPagina, limitePorPagina };
    return armarPaginado(
      await this.colaboracionRepository.listarDeProyecto(proyectoId, pagina, {
        privadas,
        estado,
      }),
      pagina,
    );
  }

  async listarPorColaborador(colaboradorId, { incluirAnonimas = false } = {}) {
    await this.colaboradorService.buscarPorId(colaboradorId);
    const colaboraciones = (
      await this.colaboracionRepository.buscarDeColaborador(colaboradorId)
    ).filter((c) => incluirAnonimas || c.esPublica);
    const proyectos = await this.proyectosDe(colaboraciones);

    return colaboraciones.map((c) => {
      const proyecto = proyectos.get(String(c.proyectoId));
      return {
        proyectoId: proyecto.id,
        proyecto: { id: proyecto.id, titulo: proyecto.titulo, estado: proyecto.estado },
        perfil: resumirPerfil(proyecto.buscarPerfil(c.perfil)),
        colaboracion: c,
      };
    });
  }
}

function resumirPerfil(perfil) {
  return perfil
    ? { id: perfil.id, titulo: perfil.titulo ?? null, descripcion: perfil.descripcion }
    : null;
}
