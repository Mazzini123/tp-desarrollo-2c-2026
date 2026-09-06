/**
 * Arma el resultado paginado a partir de lo que devuelve el
 * repositorio. La conclusión "cuántas páginas hay" es del Service:
 * no es un detalle de almacenamiento ni de HTTP.
 *
 * Si no hay elementos, hay cero páginas (no una página vacía): así el
 * frontend no dibuja un botón "1" que no lleva a ningún lado.
 */
export function armarPaginado({ items, total }, numeroPagina, limitePorPagina) {
  const totalPaginas = total === 0 ? 0 : Math.ceil(total / limitePorPagina);

  return { items, numeroPagina, limitePorPagina, totalPaginas, total };
}
