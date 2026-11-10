import { TIPO_NOTIFICACION } from "../domain/enums/TIPO_NOTIFICACION.js";
import { proyectoAceptaPostulaciones } from "./reglasDeBusqueda.js";

const MAXIMO_DE_PROYECTOS_EN_UN_AVISO = 5;

export class AvisoAutomaticoService {
  constructor({ colaboradorRepository, proyectoRepository, notificacionService }) {
    this.colaboradorRepository = colaboradorRepository;
    this.proyectoRepository = proyectoRepository;
    this.notificacionService = notificacionService;
  }

  async avisarPorProyectoNuevo(proyecto) {
    if (!proyectoAceptaPostulaciones(proyecto)) {
      return [];
    }

    const candidatas = new Map();
    for (const perfil of proyecto.perfiles) {
      const encontradas = await this.colaboradorRepository.buscarPorHabilidades(
        perfil.codigosRequeridos(),
      );
      encontradas.forEach((colaborador) => candidatas.set(colaborador.id, colaborador));
    }

    const avisos = [...candidatas.values()].map((colaborador) =>
      this.notificacionService.notificar(colaborador, {
        tipo: TIPO_NOTIFICACION.PROYECTOS_COMPATIBLES,
        asunto: `Hay un proyecto nuevo para vos: "${proyecto.titulo}"`,
        contenido: `El proyecto "${proyecto.titulo}" busca personas con tus habilidades.`,
        referencias: { proyectoIds: [proyecto.id] },
      }),
    );

    return this.contarEnviados(avisos);
  }

  async avisarPorColaboradorNuevo(colaborador) {
    const { items: destacados, total } = await this.proyectoRepository.buscarCompatibles(
      colaborador,
      1,
      MAXIMO_DE_PROYECTOS_EN_UN_AVISO,
    );

    if (total === 0) {
      return [];
    }

    const aviso = this.notificacionService.notificar(colaborador, {
      tipo: TIPO_NOTIFICACION.PROYECTOS_COMPATIBLES,
      asunto: `Hay ${total} proyecto(s) que coinciden con tus habilidades`,
      contenido: destacados.map((p) => `- ${p.titulo}`).join("\n"),
      referencias: { proyectoIds: destacados.map((p) => p.id) },
    });

    return this.contarEnviados([aviso]);
  }

  async contarEnviados(avisos) {
    const resultados = await Promise.allSettled(avisos);
    return resultados
      .filter((r) => r.status === "fulfilled" && r.value !== null)
      .map((r) => r.value);
  }
}
