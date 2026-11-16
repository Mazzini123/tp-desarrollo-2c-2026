import { resumenDeProyecto } from "./resumenDeProyecto.js";
import { metaDePrimeraPagina } from "./paginacion.js";

export function detalleDeProyecto(
  proyecto,
  pagina,
  aceptadasPorPerfil,
  esDueno,
  { conDatosDeGestion = false } = {},
) {
  const respuesta = resumenDeProyecto(proyecto);
  for (const perfil of respuesta.perfiles) {
    perfil.cantidadAceptadas = aceptadasPorPerfil.get(perfil.id) ?? 0;
  }
  respuesta.urlSistema = proyecto.urlSistema;
  respuesta.urlRepositorio = proyecto.urlRepositorio;
  respuesta.visualizaciones = proyecto.visualizaciones;
  respuesta.fechaFinalizacion = proyecto.fechaFinalizacion;
  respuesta.logros = proyecto.logros.map((logro) => ({
    id: String(logro._id),
    titulo: logro.titulo,
    descripcion: logro.descripcion,
    fecha: logro.fecha,
  }));
  respuesta.avances = proyecto.avances.map((avance) => ({
    id: String(avance._id),
    porcentajeConcrecion: avance.porcentajeConcrecion,
    urlSistema: avance.urlSistema,
    urlRepositorio: avance.urlRepositorio,
    fecha: avance.fecha,
  }));
  respuesta.colaboraciones = pagina.items.map((colaboracion) => colaboracion.toJSON());
  respuesta.colaboracionesMeta = {
    ...metaDePrimeraPagina(pagina.total),
    privadas: esDueno,
  };
  if (conDatosDeGestion) {
    respuesta.publicacion = publicacionDe(proyecto);
    respuesta.terminos = proyecto.terminos
      ? { version: proyecto.terminos.version, aceptadosEn: proyecto.terminos.aceptadosEn }
      : null;
    respuesta.baja = bajaDe(proyecto);
  }
  return respuesta;
}

export function bajaDe({ baja }) {
  return baja ? { motivo: baja.motivo, fecha: baja.fecha } : null;
}

export function publicacionDe({ publicacion }) {
  if (!publicacion) return null;
  return {
    solicitadaEn: publicacion.solicitadaEn,
    revisionId: String(publicacion.revisionId),
    rechazo: publicacion.rechazo
      ? { nota: publicacion.rechazo.nota, fecha: publicacion.rechazo.fecha }
      : null,
    aprobadaEn: publicacion.aprobadaEn ?? null,
  };
}
