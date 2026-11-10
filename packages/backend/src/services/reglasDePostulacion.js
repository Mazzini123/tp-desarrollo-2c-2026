import { DomainError } from "../errors/DomainError.js";
import { MODO_ACEPTACION } from "../domain/enums/MODO_ACEPTACION.js";
import { TIPO_NOTIFICACION } from "../domain/enums/TIPO_NOTIFICACION.js";

export function aplicarModoDeAceptacion(proyecto, perfil, fecha) {
  const aceptadas = [];
  const rechazadas = [];
  const pendientes = pendientesDelPerfil(proyecto, perfil);

  if (perfil.modoAceptacion === MODO_ACEPTACION.TODO_SUMA) {
    pendientes.forEach((c) => {
      c.aceptar(fecha);
      aceptadas.push(c);
    });
  }

  if (perfil.modoAceptacion === MODO_ACEPTACION.HASTA_LLENAR_VACANTES) {
    const vacantesLibres =
      perfil.limiteColaboraciones - proyecto.cantidadAceptadas(perfil);

    if (pendientes.length >= vacantesLibres) {
      pendientes.slice(0, vacantesLibres).forEach((c) => {
        c.aceptar(fecha);
        aceptadas.push(c);
      });
    }
  }

  const limiteAlcanzado = perfil.limiteAlcanzado(proyecto.cantidadAceptadas(perfil));
  if (limiteAlcanzado && perfil.modoAceptacion !== MODO_ACEPTACION.REVISION_MANUAL) {
    perfil.busquedaAbierta = false;
    rechazadas.push(...rechazarPendientesDelPerfil(proyecto, perfil, fecha));
  }

  return { aceptadas, rechazadas };
}

function pendientesDelPerfil(proyecto, perfil) {
  return proyecto
    .colaboracionesPendientes()
    .filter((c) => String(c.perfil) === String(perfil.id));
}

function rechazarPendientesDelPerfil(proyecto, perfil, fecha) {
  const pendientes = pendientesDelPerfil(proyecto, perfil);
  pendientes.forEach((c) => c.rechazar(fecha));
  return pendientes;
}

export function cerrarProyecto(proyecto, fecha) {
  proyecto.finalizarProyecto(fecha);

  const finalizadas = proyecto.colaboraciones.filter((c) => c.estaAceptada());
  finalizadas.forEach((c) => c.finalizar(fecha));

  return { aceptadas: [], rechazadas: rechazarPendientes(proyecto, fecha), finalizadas };
}

export function rechazarPendientes(proyecto, fecha) {
  const pendientes = proyecto.colaboracionesPendientes();
  pendientes.forEach((c) => c.rechazar(fecha));
  return pendientes;
}

export function validarModoDeAceptacion(
  modoAceptacion,
  limiteVacantes,
  aceptadasActuales = 0,
) {
  const hayLimite = limiteVacantes !== null && limiteVacantes !== undefined;

  if (modoAceptacion === MODO_ACEPTACION.TODO_SUMA && hayLimite) {
    throw new DomainError("TODO_SUMA solo se puede usar si no hay limite de vacantes");
  }
  if (modoAceptacion === MODO_ACEPTACION.HASTA_LLENAR_VACANTES && !hayLimite) {
    throw new DomainError(
      "HASTA_LLENAR_VACANTES solo se puede usar si hay limite de vacantes",
    );
  }
  if (hayLimite && limiteVacantes < aceptadasActuales) {
    throw new DomainError(
      `El limite no puede ser menor a las ${aceptadasActuales} colaboraciones ya aceptadas`,
    );
  }
}

// Las postulaciones retiradas no cuentan: se puede volver a postular.
export function yaSePostuloAlPerfil(proyecto, colaborador, perfil) {
  return proyecto.colaboraciones.some(
    (c) =>
      c.esDe(colaborador) && !c.estaRetirada() && String(c.perfil) === String(perfil.id),
  );
}

// Los datos de contacto solo se comparten con una colaboracion aceptada y publica.
export function puedeVerContactoDe(proyecto, colaborador) {
  return proyecto.colaboraciones.some(
    (c) => c.esDe(colaborador) && c.estaAceptada() && c.esPublica,
  );
}

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
    try {
      await notificacionService.notificar(colaboracion.colaborador, {
        tipo,
        asunto,
        contenido: `${asunto}.`,
        referencias: { proyectoId: proyecto.id, colaboracionId: colaboracion.id },
      });
    } catch (error) {
      console.error(
        "No se pudo notificar la resolucion de una postulacion:",
        error.message,
      );
    }
  }
}
