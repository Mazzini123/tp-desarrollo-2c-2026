import { InMemoryRepository } from "./InMemoryRepository.js";

export class InMemoryColectivoRepository extends InMemoryRepository {
  buscarProyecto(proyectoId) {
    for (const colectivo of this.listar()) {
      const proyecto = colectivo.buscarProyecto(proyectoId);
      if (proyecto) {
        return { colectivo, proyecto };
      }
    }
    return null;
  }

  buscarPorCuenta(cuentaId) {
    return this.listar().find((c) => c.cuentaId === cuentaId) ?? null;
  }

  registrarVisualizacion(proyectoId) {
    const resultado = this.buscarProyecto(proyectoId);
    if (resultado) {
      resultado.proyecto.visualizaciones += 1;
    }
  }

  buscarPerfil(proyectoId, perfilId) {
    const proyectoConColectivo = this.buscarProyecto(proyectoId);

    if (!proyectoConColectivo) {
      return null;
    }

    const { colectivo, proyecto } = proyectoConColectivo;
    const perfil = proyecto.buscarPerfil(perfilId);

    if (!perfil) {
      return null;
    }

    return { colectivo, proyecto, perfil };
  }

  listarPaginado(numeroPagina, limitePorPagina, { etiqueta } = {}) {
    const todos = this.listar().filter(
      (c) => !etiqueta || c.etiquetas.includes(etiqueta),
    );
    const inicio = (numeroPagina - 1) * limitePorPagina;

    return { items: todos.slice(inicio, inicio + limitePorPagina), total: todos.length };
  }

  buscarConCierreVencido(ahora) {
    return this.listar().filter((c) => c.proyectos.some((p) => p.cierreVencido(ahora)));
  }

  buscarColectivosDeColaborador(colaboradorId) {
    return this.listar().filter((colectivo) =>
      colectivo.proyectos.some((p) =>
        p.colaboraciones.some((c) => c.esDe(colaboradorId)),
      ),
    );
  }

  listarProyectos() {
    return this.listar().flatMap((colectivo) => colectivo.proyectos);
  }

  buscarProyectosCompatibles(
    colaborador,
    numeroPagina,
    limitePorPagina,
    ahora = new Date(),
  ) {
    const todos = this.listarProyectos().filter(
      (proyecto) =>
        proyecto.estaAbierto() &&
        !proyecto.yaColaboraron(colaborador) &&
        proyecto.perfiles.some(
          (perfil) =>
            perfil.aceptaPostulaciones(ahora) &&
            !perfil.limiteAlcanzado(proyecto.cantidadAceptadas(perfil)) &&
            perfil.cumpleHabilidadesRequeridas(colaborador),
        ),
    );
    const inicio = (numeroPagina - 1) * limitePorPagina;

    return { items: todos.slice(inicio, inicio + limitePorPagina), total: todos.length };
  }

  listarProyectosPaginado(numeroPagina, limitePorPagina, filtros = {}) {
    const todos = this.listar().flatMap((colectivo) =>
      colectivo.proyectos.filter((p) => cumpleFiltros(colectivo, p, filtros)),
    );
    const inicio = (numeroPagina - 1) * limitePorPagina;

    return {
      items: todos.slice(inicio, inicio + limitePorPagina),
      total: todos.length,
    };
  }
}

function cumpleFiltros(
  colectivo,
  proyecto,
  { etiqueta, estado, habilidad, tipoColectivo, ubicacion, modalidad },
) {
  const codigos = (perfil) => [...perfil.codigosRequeridos(), ...perfil.codigosOpcionales()];
  return (
    (!etiqueta || proyecto.etiquetas.includes(etiqueta)) &&
    (!estado || proyecto.estado === estado) &&
    (!tipoColectivo || colectivo.tipoColectivo === tipoColectivo) &&
    (!ubicacion || colectivo.ubicacion?.nombre === ubicacion) &&
    (!modalidad || proyecto.perfiles.some((p) => p.modalidadColaboracion === modalidad)) &&
    (!habilidad || proyecto.perfiles.some((p) => codigos(p).includes(habilidad)))
  );
}
