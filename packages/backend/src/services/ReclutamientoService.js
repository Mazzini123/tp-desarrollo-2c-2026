import { DomainError } from "../errors/DomainError.js";
import { ConflictError } from "../errors/ConflictError.js";
import { TIPO_NOTIFICACION } from "../domain/enums/TIPO_NOTIFICACION.js";
import { armarPaginado } from "../utils/paginacion.js";

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

  async buscarColaboradoras(
    proyectoId,
    perfilId,
    { numeroPagina = 1, limitePorPagina = 10 } = {},
  ) {
    const { proyecto, perfil } = await this.perfilService.buscarPerfilConProyecto(
      proyectoId,
      perfilId,
    );

    const pagina = await this.colaboradorRepository.buscarPotenciales(
      {
        requeridas: perfil.codigosRequeridos(),
        opcionales: perfil.codigosOpcionales(),
        excluirIds: proyecto.colaboraciones.map((c) => c.colaborador._id),
      },
      numeroPagina,
      limitePorPagina,
    );

    return armarPaginado(pagina, numeroPagina, limitePorPagina);
  }

  async buscarProyectos(colaboradorId, { numeroPagina = 1, limitePorPagina = 10 } = {}) {
    const colaborador = await this.colaboradorService.buscarPorId(colaboradorId);

    const pagina = await this.colectivoRepository.buscarProyectosCompatibles(
      colaborador,
      numeroPagina,
      limitePorPagina,
    );

    return armarPaginado(pagina, numeroPagina, limitePorPagina);
  }

  async invitar(proyectoId, perfilId, { colaboradorId, mensaje }) {
    const { colectivo, proyecto, perfil } =
      await this.perfilService.buscarPerfilConProyecto(proyectoId, perfilId);
    const colaborador = await this.colaboradorService.buscarPorId(colaboradorId);

    if (!proyecto.aceptaPostulaciones()) {
      throw new ConflictError(
        "El proyecto no esta recibiendo postulaciones (finalizado o con el cupo completo)",
      );
    }

    if (!perfil.cumpleHabilidadesRequeridas(colaborador)) {
      throw new DomainError(
        "La persona no tiene todas las habilidades requeridas del perfil",
      );
    }

    if (proyecto.yaColaboraron(colaborador)) {
      throw new ConflictError("La persona ya se postulo a este proyecto");
    }

    if (await this.notificacionService.yaInvitada(colaborador.id, perfil.id)) {
      throw new ConflictError("La persona ya fue invitada a este perfil");
    }

    if (!colaborador.recibeMensajeriaInterna) {
      throw new ConflictError(
        "La persona no acepta ser contactada por mensajeria interna",
      );
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
      referencias: {
        colectivoId: colectivo.id,
        proyectoId: proyecto.id,
        perfilId: perfil.id,
      },
    });
  }
}
