import { InMemoryRepository } from "./InMemoryRepository.js";

// Doble de test de MongoColaboradorRepository: las mismas consultas, hechas
// recorriendo la lista. Aca si se filtra en memoria; en produccion lo hace
// la base (ver la version Mongo).
export class InMemoryColaboradorRepository extends InMemoryRepository {
  // Las que tienen TODAS las habilidades pedidas.
  buscarPorHabilidades(codigos) {
    return this.listar().filter((colaborador) => tieneTodas(colaborador, codigos));
  }

  buscarPotenciales(
    { requeridas, opcionales = [], excluirIds = [] },
    numeroPagina,
    limitePorPagina,
  ) {
    const excluidas = new Set(excluirIds.map((id) => String(id?._id ?? id)));

    const resultados = this.listar()
      .filter((c) => tieneTodas(c, requeridas) && !excluidas.has(c.id))
      .map((colaborador) => ({
        colaborador,
        habilidadesOpcionalesQueTiene: opcionales.filter((codigo) =>
          tiene(colaborador, codigo),
        ),
      }))
      // sort es estable: a igual cantidad de opcionales, queda el orden de alta.
      .sort(
        (a, b) =>
          b.habilidadesOpcionalesQueTiene.length - a.habilidadesOpcionalesQueTiene.length,
      );

    const inicio = (numeroPagina - 1) * limitePorPagina;
    return {
      items: resultados.slice(inicio, inicio + limitePorPagina),
      total: resultados.length,
    };
  }
}

function tiene(colaborador, codigo) {
  return colaborador.habilidades.some((h) => h.codigo === codigo);
}

function tieneTodas(colaborador, codigos) {
  return codigos.length > 0 && codigos.every((codigo) => tiene(colaborador, codigo));
}
