import { DomainError } from "../errors/DomainError.js";
import { ConflictError } from "../errors/ConflictError.js";
import { TIPO_NOTIFICACION } from "../domain/enums/TIPO_NOTIFICACION.js";
import { armarPaginado } from "../utils/paginacion.js";

// "Las organizaciones pueden buscar colaboradoras acordes a perfiles y
// contactarlas: si la persona destinataria ha aceptado ser contactada, se
// envia un mensaje interno dentro de la aplicacion" — enunciado, 2da entrega.
export class ReclutamientoService {
  constructor({
    colaboradorRepository,
    colectivoRepository,
    colaboradorService,
    perfilService,
    notificacionService,
  }) {
    this.colaboradorRepository = colaboradorRepository;
    this.colectivoRepository = colectivoRepository;
    this.colaboradorService = colaboradorService;
    this.perfilService = perfilService;
    this.notificacionService = notificacionService;
  }

  async buscarColaboradoras(proyectoId, perfilId, { numeroPagina = 1, limitePorPagina = 10 } = {}) {
    const { proyecto, perfil } = await this.perfilService.buscarPerfilConProyecto(
      proyectoId,
      perfilId,
    );

    // La base filtra por las habilidades requeridas ($all en Mongo): asi no se
    // traen a memoria todas las personas de la plataforma.
    const codigosRequeridos = perfil.habilidadesRequeridas.map((h) => h.codigo);
    const candidatas = await this.colaboradorRepository.buscarPorHabilidades(codigosRequeridos);

    const resultados = candidatas
      // La regla de negocio es la misma que valida la postulacion.
      .filter((colaborador) => perfil.cumpleHabilidadesRequeridas(colaborador))
      // Quien ya se postulo no es una colaboradora "potencial".
      .filter((colaborador) => !proyecto.yaColaboraron(colaborador))
      .map((colaborador) => ({
        colaborador,
        habilidadesOpcionalesQueTiene: perfil.habilidadesOpcionales
          .filter((habilidad) => colaborador.tieneHabilidad(habilidad))
          .map((habilidad) => habilidad.codigo),
      }))
      // Primero las que ademas cumplen mas habilidades opcionales.
      .sort(
        (a, b) => b.habilidadesOpcionalesQueTiene.length - a.habilidadesOpcionalesQueTiene.length,
      );

    // El orden depende de las opcionales, que no estan en el filtro de la base:
    // por eso se pagina en memoria, despues de ordenar.
    const inicio = (numeroPagina - 1) * limitePorPagina;
    return armarPaginado(
      { items: resultados.slice(inicio, inicio + limitePorPagina), total: resultados.length },
      numeroPagina,
      limitePorPagina,
    );
  }

  // "Las personas colaboradoras pueden buscar proyectos que encajen con sus
  // habilidades" — enunciado, 2da entrega (requerimiento 3.d).
  async buscarProyectos(colaboradorId, { numeroPagina = 1, limitePorPagina = 10 } = {}) {
    const colaborador = await this.colaboradorService.buscarPorId(colaboradorId);

    // A diferencia de buscarColaboradoras, aca no hay un unico perfil fijo
    // contra el que filtrar en la base: cada proyecto puede tener varios
    // perfiles con distintas habilidades requeridas. Se trae todo y se
    // filtra en memoria, igual que AvisoAutomaticoService.avisarPorColaboradorNuevo.
    const proyectos = await this.colectivoRepository.listarProyectos();

    const resultados = proyectos.filter(
      (proyecto) =>
        proyecto.aceptaPostulaciones() &&
        proyecto.cumpleAlgunPerfil(colaborador) &&
        !proyecto.yaColaboraron(colaborador),
    );

    const inicio = (numeroPagina - 1) * limitePorPagina;
    return armarPaginado(
      { items: resultados.slice(inicio, inicio + limitePorPagina), total: resultados.length },
      numeroPagina,
      limitePorPagina,
    );
  }

  async invitar(proyectoId, perfilId, { colaboradorId, mensaje }) {
    const { colectivo, proyecto, perfil } = await this.perfilService.buscarPerfilConProyecto(
      proyectoId,
      perfilId,
    );
    const colaborador = await this.colaboradorService.buscarPorId(colaboradorId);

    if (!proyecto.aceptaPostulaciones()) {
      throw new ConflictError(
        "El proyecto no esta recibiendo postulaciones (finalizado o con el cupo completo)",
      );
    }

    if (!perfil.cumpleHabilidadesRequeridas(colaborador)) {
      throw new DomainError("La persona no tiene todas las habilidades requeridas del perfil");
    }

    if (proyecto.yaColaboraron(colaborador)) {
      throw new ConflictError("La persona ya se postulo a este proyecto");
    }

    if (!colaborador.recibeMensajeriaInterna) {
      throw new ConflictError("La persona no acepta ser contactada por mensajeria interna");
    }

    return this.notificacionService.notificar(colaborador, {
      tipo: TIPO_NOTIFICACION.INVITACION,
      asunto: `${colectivo.nombre} te invita a sumarte a "${proyecto.titulo}"`,
      contenido: [
        `Buscan el perfil: ${perfil.descripcion}.`,
        mensaje ? `Mensaje del colectivo: ${mensaje}` : null,
        `Podes postularte desde el proyecto ${proyecto.id}.`,
      ]
        .filter(Boolean)
        .join("\n"),
      referencias: { colectivoId: colectivo.id, proyectoId: proyecto.id, perfilId: perfil.id },
    });
  }
}
