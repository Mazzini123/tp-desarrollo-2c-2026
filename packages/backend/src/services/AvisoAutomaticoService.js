import { TIPO_NOTIFICACION } from "../domain/enums/TIPO_NOTIFICACION.js";

const MAXIMO_DE_PROYECTOS_EN_UN_AVISO = 5;

// Requerimiento adicional 9: "Al cargar un proyecto o colaborador, se buscan
// candidatos/as compatibles y se los notifica (en tiempo real o de forma
// periodica/programada)". Aca es en tiempo real: al momento del alta.
//
// Solo le escribe a personas: los colectivos todavia no tienen bandeja de
// mensajes (no hay usuarios hasta la tercera entrega). Por eso, cuando se
// carga una persona, el aviso le llega a ella con los proyectos que le
// sirven, y no a los colectivos.
export class AvisoAutomaticoService {
  constructor({ colaboradorRepository, colectivoRepository, notificacionService }) {
    this.colaboradorRepository = colaboradorRepository;
    this.colectivoRepository = colectivoRepository;
    this.notificacionService = notificacionService;
  }

  // Un proyecto nuevo: se avisa a quien cumple las habilidades requeridas de
  // alguno de sus perfiles.
  async avisarPorProyectoNuevo(proyecto) {
    if (!proyecto.aceptaPostulaciones()) {
      return [];
    }

    const candidatas = new Map();
    for (const perfil of proyecto.perfiles) {
      const codigos = perfil.habilidadesRequeridas.map((h) => h.codigo);
      const encontradas = await this.colaboradorRepository.buscarPorHabilidades(codigos);
      encontradas
        .filter((colaborador) => perfil.cumpleHabilidadesRequeridas(colaborador))
        .forEach((colaborador) => candidatas.set(colaborador.id, colaborador));
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

  // Una persona nueva: se le avisa que proyectos abiertos le sirven.
  async avisarPorColaboradorNuevo(colaborador) {
    const proyectos = await this.colectivoRepository.listarProyectos();
    const compatibles = proyectos.filter(
      (proyecto) =>
        proyecto.aceptaPostulaciones() &&
        proyecto.cumpleAlgunPerfil(colaborador) &&
        !proyecto.yaColaboraron(colaborador),
    );

    if (compatibles.length === 0) {
      return [];
    }

    const destacados = compatibles.slice(0, MAXIMO_DE_PROYECTOS_EN_UN_AVISO);
    const aviso = this.notificacionService.notificar(colaborador, {
      tipo: TIPO_NOTIFICACION.PROYECTOS_COMPATIBLES,
      asunto: `Hay ${compatibles.length} proyecto(s) que coinciden con tus habilidades`,
      contenido: destacados.map((p) => `- ${p.titulo}`).join("\n"),
      referencias: { proyectoIds: destacados.map((p) => p.id) },
    });

    return this.contarEnviados([aviso]);
  }

  // Un aviso que falla no frena a los demas.
  async contarEnviados(avisos) {
    const resultados = await Promise.allSettled(avisos);
    return resultados
      .filter((r) => r.status === "fulfilled" && r.value !== null)
      .map((r) => r.value);
  }
}
