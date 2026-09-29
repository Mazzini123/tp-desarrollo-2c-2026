import { DomainError } from "../errors/DomainError.js";
import { MODO_ACEPTACION, esModoAceptacionValido } from "../domain/enums/MODO_ACEPTACION.js";
import { TIPO_NOTIFICACION } from "../domain/enums/TIPO_NOTIFICACION.js";

// Reglas de postulacion que usan varios services (ColaboracionService y
// ProyectoService). Viven aca, como funciones, para que ningun service tenga
// que depender del otro: ProyectoService no puede conocer a
// ColaboracionService porque ColaboracionService ya depende de el.

// Requerimiento adicional 8. Resuelve las postulaciones pendientes segun el
// modo del proyecto y devuelve que cambio, para poder avisarle a cada persona.
export function aplicarModoDeAceptacion(proyecto, fecha) {
  const aceptadas = [];
  const rechazadas = [];
  const pendientes = proyecto.colaboracionesPendientes();

  if (proyecto.modoAceptacion === MODO_ACEPTACION.TODO_SUMA) {
    pendientes.forEach((c) => {
      c.aceptar(fecha);
      aceptadas.push(c);
    });
  }

  if (proyecto.modoAceptacion === MODO_ACEPTACION.HASTA_LLENAR_VACANTES) {
    const vacantesLibres = proyecto.limiteVacantes - proyecto.cantidadAceptadas();

    // "Una vez que se alcanza el limite, se aceptan todas": mientras no se
    // junten suficientes postulaciones, quedan pendientes.
    if (pendientes.length >= vacantesLibres) {
      pendientes.slice(0, vacantesLibres).forEach((c) => {
        c.aceptar(fecha);
        aceptadas.push(c);
      });
    }
  }

  // "...se cierra la postulacion y se rechazan las demas". En revision manual
  // no: "no hay rechazos ni aceptaciones automaticas".
  if (proyecto.cupoCompleto() && proyecto.modoAceptacion !== MODO_ACEPTACION.REVISION_MANUAL) {
    rechazadas.push(...rechazarPendientes(proyecto, fecha));
  }

  return { aceptadas, rechazadas };
}

export function rechazarPendientes(proyecto, fecha) {
  const pendientes = proyecto.colaboracionesPendientes();
  pendientes.forEach((c) => c.rechazar(fecha));
  return pendientes;
}

// Las combinaciones que el enunciado permite.
export function validarModoDeAceptacion(modoAceptacion, limiteVacantes, aceptadasActuales = 0) {
  if (!esModoAceptacionValido(modoAceptacion)) {
    throw new DomainError(`Modo de aceptacion invalido: ${modoAceptacion}`);
  }

  const hayLimite = limiteVacantes !== null && limiteVacantes !== undefined;

  if (hayLimite && (!Number.isInteger(limiteVacantes) || limiteVacantes <= 0)) {
    throw new DomainError("limiteVacantes debe ser un entero positivo");
  }
  if (modoAceptacion === MODO_ACEPTACION.TODO_SUMA && hayLimite) {
    throw new DomainError("TODO_SUMA solo se puede usar si no hay limite de vacantes");
  }
  if (modoAceptacion === MODO_ACEPTACION.HASTA_LLENAR_VACANTES && !hayLimite) {
    throw new DomainError("HASTA_LLENAR_VACANTES solo se puede usar si hay limite de vacantes");
  }
  if (hayLimite && limiteVacantes < aceptadasActuales) {
    throw new DomainError(
      `El limite no puede ser menor a las ${aceptadasActuales} colaboraciones ya aceptadas`,
    );
  }
}

// Le avisa a cada persona como se resolvio su postulacion. Nunca hace fallar
// la operacion que la resolvio: un aviso que no sale no deshace la aceptacion.
export async function notificarResoluciones(notificacionService, proyecto, { aceptadas, rechazadas }) {
  const avisos = [
    ...aceptadas.map((c) => [c, TIPO_NOTIFICACION.POSTULACION_ACEPTADA, "aceptada"]),
    ...rechazadas.map((c) => [c, TIPO_NOTIFICACION.POSTULACION_RECHAZADA, "rechazada"]),
  ];

  for (const [colaboracion, tipo, resultado] of avisos) {
    try {
      await notificacionService.notificar(colaboracion.colaborador, {
        tipo,
        asunto: `Tu postulacion a "${proyecto.titulo}" fue ${resultado}`,
        contenido: `Tu postulacion al proyecto "${proyecto.titulo}" fue ${resultado}.`,
        referencias: { proyectoId: proyecto.id, colaboracionId: colaboracion.id },
      });
    } catch (error) {
      console.error("No se pudo notificar la resolucion de una postulacion:", error.message);
    }
  }
}
