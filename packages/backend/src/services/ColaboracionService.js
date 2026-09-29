import { Colaboracion } from "../domain/Colaboracion.js";
import { DomainError } from "../errors/DomainError.js";
import { ConflictError } from "../errors/ConflictError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { aplicarModoDeAceptacion, notificarResoluciones } from "./reglasDePostulacion.js";

export class ColaboracionService {
  constructor({ colectivoRepository, proyectoService, colaboradorService, notificacionService }) {
    this.colectivoRepository = colectivoRepository;
    this.proyectoService = proyectoService;
    this.colaboradorService = colaboradorService;
    this.notificacionService = notificacionService;
  }

  // Anotarse a un proyecto es postularse. Segun el modo de aceptacion del
  // proyecto, la postulacion queda pendiente o se resuelve en el momento.
  async registrar({ proyectoId, colaboradorId, esPublica = true }, ahora = new Date()) {
    const { colectivo, proyecto } = await this.proyectoService.buscarProyectoConColectivo(proyectoId);
    const colaborador = await this.colaboradorService.buscarPorId(colaboradorId);

    // Si la fecha de cierre ya paso pero el job todavia no lo cerro, se
    // cierra ahora: nadie puede postularse despues de la fecha limite.
    if (proyecto.cierreVencido(ahora)) {
      await this.proyectoService.cerrar(colectivo, [proyecto], ahora);
    }

    if (!proyecto.estaAbierto()) {
      throw new ConflictError("No se puede anotar a un proyecto que ya está finalizado");
    }

    if (proyecto.cupoCompleto()) {
      throw new ConflictError("El proyecto ya completo sus vacantes: la postulacion esta cerrada");
    }

    if (!proyecto.cumpleAlgunPerfil(colaborador)) {
      throw new DomainError("El colaborador debe cumplir todas las habilidades requeridas de al menos un perfil");
    }

    if (this.yaEstaAnotado(colaborador, proyecto)) {
      throw new ConflictError("El colaborador ya está anotado en este proyecto");
    }

    const colaboracion = new Colaboracion({ colaborador, esPublica, fecha: ahora });
    proyecto.agregarColaboracion(colaboracion);

    const cambios = aplicarModoDeAceptacion(proyecto, ahora);
    await this.colectivoRepository.guardar(colectivo);

    // A quien se acaba de postular no se le avisa: la respuesta ya le dice
    // como quedo. Si su postulacion lleno el cupo, al resto si.
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
    const { colectivo, proyecto } = await this.proyectoService.buscarProyectoConColectivo(proyectoId);
    const colaboracion = proyecto.buscarColaboracion(colaboracionId);

    if (!colaboracion) {
      throw new NotFoundError(
        `No existe la colaboracion "${colaboracionId}" en el proyecto "${proyectoId}"`,
      );
    }

    return { colectivo, proyecto, colaboracion };
  }

  // Aceptacion manual: tiene "los mismos efectos" que la automatica.
  async aceptar(proyectoId, colaboracionId, ahora = new Date()) {
    const { colectivo, proyecto, colaboracion } = await this.buscarColaboracion(
      proyectoId,
      colaboracionId,
    );

    if (proyecto.cierreVencido(ahora)) {
      await this.proyectoService.cerrar(colectivo, [proyecto], ahora);
    }

    this.verificarPendiente(proyecto, colaboracion, "aceptar");

    if (proyecto.cupoCompleto()) {
      throw new ConflictError("El proyecto ya completo sus vacantes");
    }

    colaboracion.aceptar(ahora);
    // Si esta aceptacion lleno el cupo, en los modos automaticos se rechazan
    // las pendientes que quedaban.
    const cambios = aplicarModoDeAceptacion(proyecto, ahora);
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

  verificarPendiente(proyecto, colaboracion, accion) {
    if (!proyecto.estaAbierto()) {
      throw new ConflictError(`No se puede ${accion} una postulacion de un proyecto finalizado`);
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

  // Es el historial publico de la persona: las contribuciones anonimas no
  // aparecen, porque listarlas aca diria justamente quien las hizo.
  async listarPorColaborador(colaboradorId) {
    const colaborador = await this.colaboradorService.buscarPorId(colaboradorId);
    const proyectos = await this.colectivoRepository.listarProyectos();

    return proyectos.flatMap((proyecto) =>
      proyecto.colaboraciones
        .filter((c) => c.colaborador.id === colaborador.id && c.esPublica)
        .map((c) => ({ proyectoId: proyecto.id, colaboracion: c })),
    );
  }
}
