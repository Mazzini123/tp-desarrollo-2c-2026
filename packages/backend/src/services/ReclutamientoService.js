import { DomainError } from "../errors/DomainError.js";
import { ConflictError } from "../errors/ConflictError.js";
import { TIPO_NOTIFICACION } from "../domain/enums/TIPO_NOTIFICACION.js";
import { ESTADO_BUSQUEDA } from "../domain/enums/ESTADO_BUSQUEDA.js";
import { armarPaginado } from "../utils/paginacion.js";
import { paginaDeResumenes } from "../dto/resumenDeProyecto.js";
import { cumpleHabilidadesRequeridas, estadoDeBusqueda } from "./reglasDeBusqueda.js";
import { yaSePostuloAlPerfil } from "./reglasDePostulacion.js";

export class ReclutamientoService {
  constructor({
    colaboradorRepository,
    proyectoRepository,
    colaboradorService,
    perfilService,
    notificacionService,
  }) {
    this.colaboradorRepository = colaboradorRepository;
    this.proyectoRepository = proyectoRepository;
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
    const paginado = { numeroPagina, limitePorPagina };

    const pagina = await this.colaboradorRepository.buscarPotenciales(
      {
        requeridas: perfil.codigosRequeridos(),
        opcionales: perfil.codigosOpcionales(),
        excluirIds: proyecto.colaboraciones
          .filter((c) => String(c.perfil) === perfil.id && !c.estaRetirada())
          .map((c) => c.colaborador._id),
      },
      paginado,
    );

    return armarPaginado(pagina, paginado);
  }

  async buscarProyectos(colaboradorId, { numeroPagina = 1, limitePorPagina = 10 } = {}) {
    const colaborador = await this.colaboradorService.buscarPorId(colaboradorId);

    const paginado = { numeroPagina, limitePorPagina };
    const pagina = await this.proyectoRepository.buscarCompatibles(colaborador, paginado);

    return paginaDeResumenes(armarPaginado(pagina, paginado));
  }

  async invitar(proyectoId, perfilId, { colaboradorId, mensaje }) {
    const { proyecto, perfil } = await this.perfilService.buscarPerfilConProyecto(
      proyectoId,
      perfilId,
    );
    const { colectivo } = proyecto;
    const colaborador = await this.colaboradorService.buscarPorId(colaboradorId);
    this.colaboradorService.exigirActiva(colaborador);

    if (estadoDeBusqueda(perfil, proyecto) !== ESTADO_BUSQUEDA.ABIERTA) {
      throw new ConflictError(
        "Este perfil no esta recibiendo postulaciones (proyecto finalizado, busqueda " +
          "cerrada o cupo completo)",
      );
    }

    if (!cumpleHabilidadesRequeridas(perfil, colaborador)) {
      throw new DomainError(
        "La persona no tiene todas las habilidades requeridas del perfil",
      );
    }

    if (yaSePostuloAlPerfil(proyecto, colaborador, perfil)) {
      throw new ConflictError("La persona ya se postulo a este perfil");
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
