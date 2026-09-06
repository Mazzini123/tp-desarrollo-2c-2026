export function armarPaginado({ items, total }, numeroPagina, limitePorPagina) {
  const totalPaginas = total === 0 ? 0 : Math.ceil(total / limitePorPagina);
  return { items, numeroPagina, limitePorPagina, totalPaginas, total };
}
