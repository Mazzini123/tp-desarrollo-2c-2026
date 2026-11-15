import { PROYECTO_ESTADO } from "../domain/enums/PROYECTO_ESTADO.js";

const MS_POR_DIA = 86_400_000;

const masReciente = (fechas) => {
  const presentes = fechas.filter(Boolean).map((fecha) => new Date(fecha));
  return presentes.length
    ? new Date(Math.max(...presentes.map((fecha) => fecha.getTime())))
    : null;
};

export function estaIniciado(proyecto, ultimaAceptacion) {
  return proyecto.estado === PROYECTO_ESTADO.ABIERTO && ultimaAceptacion != null;
}

export function ultimaActualizacion({
  avances = [],
  logros = [],
  ultimaAceptacion = null,
}) {
  return masReciente([
    ...avances.map((avance) => avance.fecha),
    ...logros.map((logro) => logro.fecha),
    ultimaAceptacion,
  ]);
}

export function fechaDeReferencia({ ultimaActualizacion, ultimaResolucion }) {
  return masReciente([ultimaActualizacion, ultimaResolucion]);
}

export function debeMarcarse({
  proyecto,
  ultimaAceptacion,
  ultimaResolucion,
  ahora,
  dias,
}) {
  if (!estaIniciado(proyecto, ultimaAceptacion)) return false;
  const referencia = fechaDeReferencia({
    ultimaActualizacion: ultimaActualizacion({
      avances: proyecto.avances,
      logros: proyecto.logros,
      ultimaAceptacion,
    }),
    ultimaResolucion,
  });
  return referencia.getTime() + dias * MS_POR_DIA <= ahora.getTime();
}
