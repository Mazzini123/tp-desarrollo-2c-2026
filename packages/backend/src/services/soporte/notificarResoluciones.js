import { TIPO_NOTIFICACION } from "../../domain/enums/TIPO_NOTIFICACION.js";

export async function notificarResoluciones(
  notificacionService,
  proyecto,
  { aceptadas = [], rechazadas = [], finalizadas = [] },
) {
  const titulo = `"${proyecto.titulo}"`;
  const avisos = [
    ...aceptadas.map((c) => [
      c,
      TIPO_NOTIFICACION.POSTULACION_ACEPTADA,
      `Tu postulacion a ${titulo} fue aceptada`,
    ]),
    ...rechazadas.map((c) => [
      c,
      TIPO_NOTIFICACION.POSTULACION_RECHAZADA,
      `Tu postulacion a ${titulo} fue rechazada`,
    ]),
    ...finalizadas.map((c) => [
      c,
      TIPO_NOTIFICACION.COLABORACION_FINALIZADA,
      `Tu colaboracion en ${titulo} finalizo: ya podes valorar al colectivo`,
    ]),
  ];

  for (const [colaboracion, tipo, asunto] of avisos) {
    await notificacionService.notificar(colaboracion.colaborador, {
      tipo,
      asunto,
      contenido: `${asunto}.`,
      referencias: { proyectoId: proyecto.id, colaboracionId: colaboracion.id },
    });
  }
}
