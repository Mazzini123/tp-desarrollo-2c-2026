import { InMemoryRepository } from "./InMemoryRepository.js";
export class InMemoryColaboradorRepository extends InMemoryRepository {
  buscarPorHabilidades(codigos) {
    return this.listar().filter((colaborador) => tieneTodas(colaborador, codigos));
  }

  buscarPorCuenta(cuentaId) {
    return this.listar().find((c) => c.cuentaId === cuentaId) ?? null;
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
