import { DomainError } from "../errors/DomainError.js";
import { ConflictError } from "../errors/ConflictError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { ForbiddenError } from "../errors/ForbiddenError.js";
import { AUTOR_VALORACION } from "../domain/enums/AUTOR_VALORACION.js";
import { TIPO_NOTIFICACION } from "../domain/enums/TIPO_NOTIFICACION.js";
import { aplicarModoDeAceptacion, notificarResoluciones } from "./reglasDePostulacion.js";

export class ColaboracionService {
  constructor({
    colectivoRepository,
    colectivoService,
    proyectoService,
    colaboradorService,
    notificacionService,
  }) {
    this.colectivoRepository = colectivoRepository;
    this.colectivoService = colectivoService;
    this.proyectoService = proyectoService;
    this.colaboradorService = colaboradorService;
    this.notificacionService = notificacionService;
  }

  async registrar(
    { proyectoId, perfilId, colaboradorId, esPublica = true },
    ahora = new Date(),
  ) {
    const { colectivo, proyecto } =
      await this.proyectoService.buscarProyectoConColectivo(proyectoId);
    const colaborador = await this.colaboradorService.buscarPorId(colaboradorId);

    if (proyecto.cierreVencido(ahora)) {
      await this.proyectoService.cerrar(colectivo, [proyecto], ahora);
    }

    if (!proyecto.estaAbierto()) {
      throw new ConflictError("No se puede anotar a un proyecto que ya está finalizado");
    }

    const perfil = proyecto.buscarPerfil(perfilId);
    if (!perfil) {
      throw new NotFoundError(
        `No existe el perfil "${perfilId}" en el proyecto "${proyectoId}"`,
      );
    }

    if (!perfil.aceptaPostulaciones(ahora)) {
      throw new ConflictError("La búsqueda de este perfil está cerrada");
    }

    if (!perfil.cumpleHabilidadesRequeridas(colaborador)) {
      throw new DomainError(
        "El colaborador debe cumplir todas las habilidades requeridas del perfil",
      );
    }

    if (this.yaEstaAnotado(colaborador, proyecto)) {
      throw new ConflictError("El colaborador ya está anotado en este proyecto");
    }

    const colaboracion = proyecto.agregarColaboracion({
      colaborador,
      perfil: perfil.id,
      esPublica,
      fecha: ahora,
    });

    const cambios = aplicarModoDeAceptacion(proyecto, perfil, ahora);
    await this.colectivoRepository.guardar(colectivo);

    await notificarResoluciones(this.notificacionService, proyecto, {
      aceptadas: cambios.aceptadas.filter((c) => c !== colaboracion),
      rechazadas: cambios.rechazadas.filter((c) => c !== colaboracion),
    });

    return colaboracion;
  }

  yaEstaAnotado(colaborador, proyecto) {
    return proyecto.yaColaboraron(colaborador);
  }

  async buscarColaboracion(proyectoId, colaboracionId) {
    const { colectivo, proyecto } =
      await this.proyectoService.buscarProyectoConColectivo(proyectoId);
    const colaboracion = proyecto.buscarColaboracion(colaboracionId);

    if (!colaboracion) {
      throw new NotFoundError(
        `No existe la colaboracion "${colaboracionId}" en el proyecto "${proyectoId}"`,
      );
    }

    return { colectivo, proyecto, colaboracion };
  }

  async aceptar(proyectoId, colaboracionId, ahora = new Date()) {
    const { colectivo, proyecto, colaboracion } = await this.buscarColaboracion(
      proyectoId,
      colaboracionId,
    );

    if (proyecto.cierreVencido(ahora)) {
      await this.proyectoService.cerrar(colectivo, [proyecto], ahora);
    }

    this.verificarPendiente(proyecto, colaboracion, "aceptar");

    const perfil = proyecto.buscarPerfil(colaboracion.perfil);

    if (perfil.limiteAlcanzado(proyecto.cantidadAceptadas(perfil))) {
      throw new ConflictError("El perfil ya alcanzó su límite de colaboraciones");
    }

    colaboracion.aceptar(ahora);

    const cambios = aplicarModoDeAceptacion(proyecto, perfil, ahora);
    await this.colectivoRepository.guardar(colectivo);

    await notificarResoluciones(this.notificacionService, proyecto, {
      aceptadas: [colaboracion, ...cambios.aceptadas],
      rechazadas: cambios.rechazadas,
    });

    return colaboracion;
  }

  async rechazar(proyectoId, colaboracionId, ahora = new Date()) {
    const { colectivo, proyecto, colaboracion } = await this.buscarColaboracion(
      proyectoId,
      colaboracionId,
    );

    this.verificarPendiente(proyecto, colaboracion, "rechazar");

    colaboracion.rechazar(ahora);
    await this.colectivoRepository.guardar(colectivo);

    await notificarResoluciones(this.notificacionService, proyecto, {
      aceptadas: [],
      rechazadas: [colaboracion],
    });

    return colaboracion;
  }

  async finalizar(proyectoId, colaboracionId, ahora = new Date()) {
    const { colectivo, proyecto, colaboracion } = await this.buscarColaboracion(
      proyectoId,
      colaboracionId,
    );

    if (!colaboracion.estaAceptada()) {
      throw new ConflictError(
        `Solo se puede finalizar una colaboracion aceptada (esta esta ${colaboracion.estado})`,
      );
    }

    colaboracion.finalizar(ahora);
    await this.colectivoRepository.guardar(colectivo);
    await notificarResoluciones(this.notificacionService, proyecto, {
      finalizadas: [colaboracion],
    });

    return colaboracion;
  }

  async desvincular(proyectoId, colaboracionId, ahora = new Date()) {
    const { colectivo, colaboracion } = await this.buscarColaboracion(
      proyectoId,
      colaboracionId,
    );

    if (!colaboracion.estaAceptada()) {
      throw new ConflictError(
        `Solo se puede desvincular una colaboracion aceptada (esta esta ${colaboracion.estado})`,
      );
    }

    colaboracion.desvincular(ahora);
    await this.colectivoRepository.guardar(colectivo);
    await this.notificarDesvinculacion(proyectoId, colaboracion);

    return colaboracion;
  }

  async datosDeContacto(proyectoId, colaboradorId) {
    const { proyecto } =
      await this.proyectoService.buscarProyectoConColectivo(proyectoId);
    const colaborador = await this.colaboradorService.buscarPorId(colaboradorId);

    if (!proyecto.puedeVerContactoDe(colaborador)) {
      throw new ForbiddenError(
        "Los datos de contacto solo se comparten con una postulacion aceptada",
      );
    }

    return colaborador.mediosDeContacto.map(({ tipo, valor }) => ({ tipo, valor }));
  }

  async notificarDesvinculacion(proyectoId, colaboracion) {
    try {
      await this.notificacionService.notificar(colaboracion.colaborador, {
        tipo: TIPO_NOTIFICACION.DESVINCULACION,
        asunto: "Ya no formás parte de un proyecto",
        contenido: "Tu colaboración en el proyecto terminó por una desvinculación.",
        referencias: { proyectoId, colaboracionId: colaboracion.id },
      });
    } catch (error) {
      console.error("No se pudo notificar la desvinculacion:", error.message);
    }
  }

  // Requerimiento adicional 39: "Al finalizar una colaboracion, tanto el
  // colectivo como la colaboradora pueden calificarse mutuamente (puntaje +
  // comentario breve)". Cada parte, una sola vez.
  async valorar(
    proyectoId,
    colaboracionId,
    { autor, puntaje, comentario },
    ahora = new Date(),
  ) {
    const { colectivo, colaboracion } = await this.buscarColaboracion(
      proyectoId,
      colaboracionId,
    );

    if (!colaboracion.estaFinalizada()) {
      throw new ConflictError("Solo se puede valorar una colaboracion finalizada");
    }

    if (!Number.isInteger(puntaje) || puntaje < 1 || puntaje > 5) {
      throw new DomainError("El puntaje tiene que ser un entero de 1 a 5");
    }

    const campo =
      autor === AUTOR_VALORACION.COLECTIVO
        ? "valoracionDelColectivo"
        : "valoracionDelColaborador";

    if (colaboracion[campo] !== null) {
      throw new ConflictError("Esa parte ya valoro esta colaboracion");
    }

    colaboracion[campo] = { puntaje, comentario, fecha: ahora };
    await this.colectivoRepository.guardar(colectivo);

    return colaboracion[campo];
  }

  async listarValoracionesDeColaborador(colaboradorId) {
    await this.colaboradorService.buscarPorId(colaboradorId);
    const colectivos =
      await this.colectivoRepository.buscarColectivosDeColaborador(colaboradorId);

    const valoraciones = colectivos.flatMap((colectivo) =>
      colectivo.proyectos.flatMap((proyecto) =>
        proyecto.colaboraciones
          .filter((c) => c.esDe(colaboradorId) && c.esPublica && c.valoracionDelColectivo)
          .map((c) => ({
            colectivo: { id: colectivo.id, nombre: colectivo.nombre },
            proyecto: { id: proyecto.id, titulo: proyecto.titulo },
            ...c.valoracionDelColectivo.toObject(),
          })),
      ),
    );

    return resumirValoraciones(valoraciones);
  }

  async listarValoracionesDeColectivo(colectivoId) {
    const colectivo = await this.colectivoService.buscarPorId(colectivoId);

    const valoraciones = colectivo.proyectos.flatMap((proyecto) =>
      proyecto.colaboraciones
        .filter((c) => c.valoracionDelColaborador)
        .map((c) => ({
          proyecto: { id: proyecto.id, titulo: proyecto.titulo },
          autor: c.esPublica ? c.colaborador : null,
          ...c.valoracionDelColaborador.toObject(),
        })),
    );

    return resumirValoraciones(valoraciones);
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

  async listarPorProyecto(proyectoId) {
    return (await this.proyectoService.buscarPorId(proyectoId)).colaboraciones;
  }

  async listarPorColaborador(colaboradorId) {
    const colaborador = await this.colaboradorService.buscarPorId(colaboradorId);
    const colectivos =
      await this.colectivoRepository.buscarColectivosDeColaborador(colaboradorId);
    const proyectos = colectivos.flatMap((colectivo) => colectivo.proyectos);

    return proyectos.flatMap((proyecto) =>
      proyecto.colaboraciones
        .filter((c) => c.esDe(colaborador) && c.esPublica)
        .map((c) => ({ proyectoId: proyecto.id, colaboracion: c })),
    );
  }
}

function resumirValoraciones(valoraciones) {
  const cantidad = valoraciones.length;
  const suma = valoraciones.reduce((total, v) => total + v.puntaje, 0);

  return {
    cantidad,
    promedio: cantidad === 0 ? null : Math.round((suma / cantidad) * 10) / 10,
    valoraciones: valoraciones.sort((a, b) => b.fecha - a.fecha),
  };
}
