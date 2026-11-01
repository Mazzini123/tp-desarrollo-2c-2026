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

  // El service arma el pedido con la regla de negocio y el repositorio lo
  // resuelve como consulta: la base filtra, ordena por opcionales y pagina.
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
        // Quien ya se postulo no es una colaboradora "potencial".
        excluirIds: proyecto.colaboraciones.map((c) => c.colaborador._id),
      },
      numeroPagina,
      limitePorPagina,
    );

    return armarPaginado(pagina, numeroPagina, limitePorPagina);
  }

  // "Las personas colaboradoras pueden buscar proyectos que encajen con sus
  // habilidades" — enunciado, 2da entrega (requerimiento 3.d).
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
