import { PROYECTO_ESTADO } from "../domain/enums/PROYECTO_ESTADO.js";

export function esDestacadoVigente(proyecto, ahora = new Date()) {
  const destacado = proyecto?.destacado;
  return Boolean(
    destacado?.desde &&
    destacado?.hasta &&
    proyecto.estado === PROYECTO_ESTADO.ABIERTO &&
    destacado.desde <= ahora &&
    ahora < destacado.hasta,
  );
}

export function motivoDeInelegibilidad(proyecto, colectivo) {
  if (proyecto.estado !== PROYECTO_ESTADO.ABIERTO) {
    return "Solo se pueden destacar proyectos abiertos";
  }
  if (!colectivo || colectivo.fechaBaja) {
    return "El colectivo del proyecto esta dado de baja";
  }
  return null;
}

export function superaElTope(vigentesDeOtros, maximo) {
  return vigentesDeOtros >= maximo;
}

export function ordenarVigentes(proyectos) {
  return [...proyectos].sort(
    (a, b) =>
      b.destacado.desde - a.destacado.desde || a.destacado.hasta - b.destacado.hasta,
  );
}
