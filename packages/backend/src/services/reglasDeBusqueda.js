import { ESTADO_BUSQUEDA } from "../domain/enums/ESTADO_BUSQUEDA.js";

export function perfilAceptaPostulaciones(perfil, ahora = new Date()) {
  const vencida =
    Boolean(perfil.fechaCierreBusqueda) && perfil.fechaCierreBusqueda <= ahora;
  return perfil.busquedaAbierta && !vencida;
}

export function proyectoAceptaPostulaciones(proyecto, ahora = new Date()) {
  return (
    proyecto.estaAbierto() &&
    !cierreVencido(proyecto, ahora) &&
    proyecto.perfiles.some(
      (perfil) => estadoDeBusqueda(perfil, proyecto, ahora) === ESTADO_BUSQUEDA.ABIERTA,
    )
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
  return estadoDeBusquedaConCupo(
    perfil,
    {
      proyectoAbierto: proyecto.estaAbierto(),
      fechaCierre: proyecto.fechaCierre,
      cupoCompleto: perfil.limiteAlcanzado(proyecto.cantidadAceptadas(perfil)),
    },
    ahora,
  );
}

export function estadoDeBusquedaConCupo(
  perfil,
  { proyectoAbierto, fechaCierre, cupoCompleto },
  ahora = new Date(),
) {
  if (!proyectoAbierto || (fechaCierre && fechaCierre <= ahora)) {
    return ESTADO_BUSQUEDA.CERRADA;
  }
  if (cupoCompleto) {
    return ESTADO_BUSQUEDA.LIMITE_ALCANZADO;
  }
  return perfilAceptaPostulaciones(perfil, ahora)
    ? ESTADO_BUSQUEDA.ABIERTA
    : ESTADO_BUSQUEDA.CERRADA;
}

export function cumpleHabilidadesRequeridas(perfil, colaborador) {
  return (
    perfil.habilidadesRequeridas.length > 0 &&
    perfil.habilidadesRequeridas.every((habilidad) =>
      colaborador.tieneHabilidad(habilidad),
    )
  );
}
