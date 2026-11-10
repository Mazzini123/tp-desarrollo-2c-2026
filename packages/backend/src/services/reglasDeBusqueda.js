import { ESTADO_BUSQUEDA } from "../domain/enums/ESTADO_BUSQUEDA.js";

// Reglas de negocio de la busqueda de colaboradoras: cuando un perfil recibe
// postulaciones y quien lo cumple. El dominio es anemico: las entidades solo
// guardan los datos y las reglas viven aca, en la capa de services.

export function perfilAceptaPostulaciones(perfil, ahora = new Date()) {
  const vencida =
    Boolean(perfil.fechaCierreBusqueda) && perfil.fechaCierreBusqueda <= ahora;
  return perfil.busquedaAbierta && !vencida;
}

export function proyectoAceptaPostulaciones(proyecto, ahora = new Date()) {
  return (
    proyecto.estaAbierto() &&
    proyecto.perfiles.some((perfil) => perfilAceptaPostulaciones(perfil, ahora))
  );
}

export function cierreVencido(proyecto, ahora) {
  return (
    proyecto.estaAbierto() &&
    Boolean(proyecto.fechaCierre) &&
    proyecto.fechaCierre <= ahora
  );
}

export function estadoDeBusqueda(perfil, proyecto, ahora = new Date()) {
  if (!proyecto.estaAbierto()) {
    return ESTADO_BUSQUEDA.CERRADA;
  }
  if (perfil.limiteAlcanzado(proyecto.cantidadAceptadas(perfil))) {
    return ESTADO_BUSQUEDA.LIMITE_ALCANZADO;
  }
  return perfilAceptaPostulaciones(perfil, ahora)
    ? ESTADO_BUSQUEDA.ABIERTA
    : ESTADO_BUSQUEDA.CERRADA;
}

// Un perfil sin habilidades requeridas no matchea a nadie.
export function cumpleHabilidadesRequeridas(perfil, colaborador) {
  return (
    perfil.habilidadesRequeridas.length > 0 &&
    perfil.habilidadesRequeridas.every((habilidad) =>
      colaborador.tieneHabilidad(habilidad),
    )
  );
}
