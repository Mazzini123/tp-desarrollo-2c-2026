import { estadoDeBusquedaConCupo } from "../services/reglasDeBusqueda.js";
import { versionDePerfil } from "../utils/versionDePerfil.js";
import { MODO_ACEPTACION } from "../domain/enums/MODO_ACEPTACION.js";
import { PROYECTO_ESTADO } from "../domain/enums/PROYECTO_ESTADO.js";

export function resumenDeProyecto(proyecto, ahora = new Date()) {
  return {
    id: String(proyecto._id),
    titulo: proyecto.titulo,
    descripcion: proyecto.descripcion,
    estado: proyecto.estado,
    porcentajeConcrecion: proyecto.porcentajeConcrecion,
    etiquetas: proyecto.etiquetas,
    fechaCreacion: proyecto.fechaCreacion,
    fechaCierre: proyecto.fechaCierre,
    colectivo: {
      id: String(proyecto.colectivoId),
      nombre: proyecto.datosDelColectivo.nombre,
      ubicacion: proyecto.datosDelColectivo.ubicacion
        ? {
            tipoUbicacion: proyecto.datosDelColectivo.ubicacion.tipoUbicacion,
            nombre: proyecto.datosDelColectivo.ubicacion.nombre,
          }
        : null,
    },
    perfiles: proyecto.perfiles.map((perfil) =>
      perfilParaRespuesta(perfil, proyecto, ahora),
    ),
  };
}

function perfilParaRespuesta(perfil, proyecto, ahora = new Date()) {
  return {
    id: String(perfil._id),
    versionEdicion: versionDePerfil(perfil),
    titulo: perfil.titulo ?? null,
    descripcion: perfil.descripcion,
    compromiso: {
      cantidadHoras: perfil.compromiso.cantidadHoras,
      periodo: perfil.compromiso.periodo,
    },
    modalidadColaboracion: perfil.modalidadColaboracion,
    habilidadesRequeridas: perfil.habilidadesRequeridas.map(habilidadParaRespuesta),
    habilidadesOpcionales: (perfil.habilidadesOpcionales ?? []).map(
      habilidadParaRespuesta,
    ),
    busquedaAbierta: perfil.busquedaAbierta ?? true,
    fechaCierreBusqueda: perfil.fechaCierreBusqueda ?? null,
    limiteColaboraciones: perfil.limiteColaboraciones ?? null,
    modoAceptacion: perfil.modoAceptacion ?? MODO_ACEPTACION.REVISION_MANUAL,
    estadoBusqueda: estadoDeBusquedaConCupo(
      { ...perfil, busquedaAbierta: perfil.busquedaAbierta ?? true },
      {
        proyectoAbierto: proyecto.estado === PROYECTO_ESTADO.ABIERTO,
        fechaCierre: proyecto.fechaCierre,
        cupoCompleto: perfil.cupoCompleto,
      },
      ahora,
    ),
  };
}

export function paginaDeResumenes(pagina) {
  return {
    ...pagina,
    items: pagina.items.map((proyecto) => resumenDeProyecto(proyecto)),
  };
}

function habilidadParaRespuesta(habilidad) {
  return { codigo: habilidad.codigo, titulo: habilidad.titulo };
}
