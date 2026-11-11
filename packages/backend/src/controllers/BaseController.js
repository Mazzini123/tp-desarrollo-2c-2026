import { metaDePaginacion } from "../dto/paginacion.js";

export class BaseController {
  aPaginacionDeDominio({ page, limit }) {
    return { numeroPagina: page, limitePorPagina: limit };
  }

  responderPaginado(res, pagina, metaExtra = {}) {
    res.status(200).json({
      data: pagina.items,
      meta: { ...metaDePaginacion(pagina), ...metaExtra },
    });
  }
}
