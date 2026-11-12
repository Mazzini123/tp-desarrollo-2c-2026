import { TIPO_NOTIFICACION } from "../domain/enums/TIPO_NOTIFICACION.js";
import { ESTADO_BUSQUEDA } from "../domain/enums/ESTADO_BUSQUEDA.js";
import { estadoDeBusquedaConCupo } from "./reglasDeBusqueda.js";
import { TIPO_AVISO } from "../domain/enums/TIPO_AVISO.js";
import { ESTADO_AVISO } from "../domain/enums/ESTADO_AVISO.js";
import { registro } from "../config/registro.js";

const PROYECTOS_POR_AVISO = Object.freeze({ numeroPagina: 1, limitePorPagina: 5 });

export const POLITICA_DE_AVISOS = Object.freeze({
  maximoDeIntentos: 5,
  esperaInicialMs: 60_000,
});

export class AvisoAutomaticoService {
  constructor({
    colaboradorRepository,
    proyectoRepository,
    notificacionService,
    avisoRepository,
  }) {
    this.colaboradorRepository = colaboradorRepository;
    this.proyectoRepository = proyectoRepository;
    this.notificacionService = notificacionService;
    this.avisoRepository = avisoRepository;
  }

  async avisarPorProyectoNuevo(proyecto) {
    return this.avisoRepository.encolar({
      clave: `proyecto:${proyecto.id}`,
      tipo: TIPO_AVISO.PROYECTO,
      entidadId: proyecto._id,
      hastaId: await this.colaboradorRepository.ultimoId(),
    });
  }

  async avisarPorColaboradorNuevo(colaborador) {
    return this.avisoRepository.encolar({
      clave: `colaborador:${colaborador.id}`,
      tipo: TIPO_AVISO.COLABORADOR,
      entidadId: colaborador._id,
      hastaId: await this.proyectoRepository.ultimoId(),
    });
  }

  async procesarPendientes(
    ahora = new Date(),
    { tope = 10, debeDetenerse = () => false } = {},
  ) {
    const pendientes = await this.avisoRepository.listarPendientes(ahora, tope);
    for (const aviso of pendientes) {
      if (debeDetenerse()) break;
      try {
        if (aviso.tipo === TIPO_AVISO.PROYECTO) {
          await this.generarPorProyecto(aviso, ahora, debeDetenerse);
        } else {
          await this.generarPorColaborador(aviso, ahora);
        }
        if (debeDetenerse()) break;
        await this.avisoRepository.actualizar(aviso, {
          estado: ESTADO_AVISO.COMPLETADO,
          ultimoError: null,
        });
      } catch (error) {
        const intentos = aviso.intentos + 1;
        registro.error("generacion_de_avisos_fallida", {
          avisoId: aviso.id,
          intentos,
          error: error.message,
        });
        await this.avisoRepository.actualizar(aviso, {
          intentos,
          estado:
            intentos >= POLITICA_DE_AVISOS.maximoDeIntentos
              ? ESTADO_AVISO.FALLIDO
              : ESTADO_AVISO.PENDIENTE,
          ultimoError: error.message,
          proximoIntento: new Date(
            ahora.getTime() + POLITICA_DE_AVISOS.esperaInicialMs * 2 ** (intentos - 1),
          ),
        });
      }
    }
  }

  async generarPorProyecto(aviso, ahora, debeDetenerse) {
    const proyecto = await this.proyectoRepository.buscarSinColaboraciones(
      aviso.entidadId,
    );
    if (!proyecto || !aviso.hastaId) return;
    const perfiles = proyecto.perfiles.filter(
      (perfil) =>
        estadoDeBusquedaConCupo(
          perfil,
          {
            proyectoAbierto: proyecto.estaAbierto(),
            fechaCierre: proyecto.fechaCierre,
            cupoCompleto: perfil.cupoCompleto,
          },
          ahora,
        ) === ESTADO_BUSQUEDA.ABIERTA,
    );
    const personas = await this.colaboradorRepository.buscarParaAviso(
      perfiles,
      aviso.hastaId,
    );
    for (const persona of personas) {
      if (debeDetenerse()) return;
      await this.notificacionService.notificar(persona, {
        clave: `${aviso.clave}:${persona.id}`,
        tipo: TIPO_NOTIFICACION.PROYECTOS_COMPATIBLES,
        asunto: `Hay un proyecto nuevo para vos: "${proyecto.titulo}"`,
        contenido: `El proyecto "${proyecto.titulo}" busca personas con tus habilidades.`,
        referencias: { proyectoIds: [proyecto.id] },
      });
    }
  }

  async generarPorColaborador(aviso, ahora) {
    const persona = await this.colaboradorRepository.buscarPorId(aviso.entidadId);
    if (!persona || persona.fechaBaja || !aviso.hastaId) return;
    const { items, total } = await this.proyectoRepository.buscarCompatibles(
      persona,
      PROYECTOS_POR_AVISO,
      { ahora, hastaId: aviso.hastaId },
    );
    if (total > 0)
      await this.notificacionService.notificar(persona, {
        clave: aviso.clave,
        tipo: TIPO_NOTIFICACION.PROYECTOS_COMPATIBLES,
        asunto: `Hay ${total} proyecto(s) que coinciden con tus habilidades`,
        contenido: items.map((p) => `- ${p.titulo}`).join("\n"),
        referencias: { proyectoIds: items.map((p) => String(p._id)) },
      });
  }
}
