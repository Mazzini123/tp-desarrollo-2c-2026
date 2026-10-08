export class BaseController {
  aPaginacionDeDominio({ page, limit }) {
    return { numeroPagina: page, limitePorPagina: limit };
  }

  responderPaginado(res, { items, numeroPagina, limitePorPagina, totalPaginas, total }) {
    res.status(200).json({
      data: items,
      meta: {
        page: numeroPagina,
        per_page: limitePorPagina,
        total,
        total_pages: totalPaginas,
      },
    });
  }
}
