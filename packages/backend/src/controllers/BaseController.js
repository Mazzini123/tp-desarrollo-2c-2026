import { AppError } from "../errors/AppError.js";
import { BadRequestError } from "../errors/BadRequestError.js";
import { ZodError } from "zod";

export class BaseController {
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

  manejarError(res, error) {
    if (error instanceof AppError) {
      return res.status(error.status).json({ status: "fail", message: error.message });
    }

    if (error instanceof ZodError) {
      return res.status(400).json({
        status: "fail",
        message: "Datos inválidos",
        issues: error.issues,
      });
    }

    console.error(error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor" });
  }
}
