import { armarPaginado } from "../utils/paginacion.js";

export const PRIMERA_PAGINA = Object.freeze({ numeroPagina: 1, limitePorPagina: 20 });

export function metaDePaginacion({ numeroPagina, limitePorPagina, total, totalPaginas }) {
  return {
    page: numeroPagina,
    per_page: limitePorPagina,
    total,
    total_pages: totalPaginas,
  };
}

export function metaDePrimeraPagina(total) {
  return metaDePaginacion(armarPaginado({ items: [], total }, PRIMERA_PAGINA));
}
