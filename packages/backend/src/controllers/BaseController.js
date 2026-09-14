/**
 * Lo unico que queda compartido entre controllers es la forma de la respuesta
 * paginada.
 *
 * Se fue `manejarError` (correccion A1): ahora la traduccion de excepcion a
 * HTTP la hace `middlewares/manejadorErrores.js`, una sola vez, al final de la
 * cadena de Express.
 *
 * Se fueron `extraerPaginacion` y `validarEnteroPositivo` (correccion A2):
 * hacian a mano lo que Zod ya hace en `schemas/paginacionSchema.js`.
 */
export class BaseController {
  /**
   * Traduce la paginacion del vocabulario HTTP (page/limit) al del dominio
   * (numeroPagina/limitePorPagina). Esa traduccion es justamente la
   * responsabilidad de esta capa.
   */
  aPaginacionDeDominio({ page, limit }) {
    return { numeroPagina: page, limitePorPagina: limit };
  }

  /**
   * Correccion A3: se fue el `status: "success"` del body. El codigo HTTP ya
   * dice si salio bien. El `meta`, en cambio, se queda: page, per_page, total
   * y total_pages no viajan en ningun header.
   */
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
