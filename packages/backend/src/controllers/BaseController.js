import { AppError, BadRequestError } from "../errors/index.js";

/**
 * Comportamiento común a todos los controladores: traducir la query
 * de paginación y traducir errores a códigos HTTP.
 *
 * Nada de esto es lógica de negocio. Son las dos tareas propias de la
 * capa: convertir lo que llega por HTTP al lenguaje del dominio, y
 * convertir lo que vuelve del dominio a HTTP.
 */
export class BaseController {
  /**
   * req.query trae strings ("2"), el service necesita números (2).
   * Además pone los valores por defecto, para que un GET sin
   * parámetros siga funcionando.
   */
  extraerPaginacion(query) {
    const numeroPagina = query?.page === undefined ? 1 : Number(query.page);
    const limitePorPagina = query?.limit === undefined ? 10 : Number(query.limit);

    this.validarEnteroPositivo(numeroPagina, "page");
    this.validarEnteroPositivo(limitePorPagina, "limit");

    return { numeroPagina, limitePorPagina };
  }

  validarEnteroPositivo(numero, parametro) {
    if (!Number.isInteger(numero) || numero <= 0) {
      throw new BadRequestError(`${parametro} debe ser un entero positivo`);
    }
  }

  /** Respuesta paginada con los metadatos que el frontend necesita
   *  para dibujar los botones de página. */
  responderPaginado(res, { items, numeroPagina, limitePorPagina, totalPaginas, total }) {
    return res.status(200).json({
      status: "success",
      data: items,
      meta: {
        page: numeroPagina,
        per_page: limitePorPagina,
        total,
        total_pages: totalPaginas,
      },
    });
  }

  /**
   * Traduce el error al código HTTP. Gracias a AppError no hace falta
   * conocer cada tipo concreto: cada subclase trae su status. Lo que
   * no es AppError es algo que no contemplamos, así que va como 500 y
   * se loguea.
   */
  manejarError(res, error) {
    if (error instanceof AppError) {
      return res.status(error.status).json({ status: "fail", message: error.message });
    }

    console.error(error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor" });
  }
}
