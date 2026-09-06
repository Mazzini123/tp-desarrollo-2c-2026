import { BaseController } from "./BaseController.js";
import { crearHabilidadSchema } from "../schemas/habilidadSchema.js";
import { habilidadService } from "../services/index.js";

export class HabilidadController extends BaseController {
  constructor(servicioHabilidad = habilidadService) {
    super();
    this.habilidadService = servicioHabilidad;
  }

  crear = (req, res) => {
    const body = req.body;
    const resultado = crearHabilidadSchema.safeParse(body);
    if (resultado.error) {
      return this.manejarError(res, resultado.error);
    }

    try {
      const habilidad = this.habilidadService.crear(resultado.data);
      return res.status(201).json({ status: "success", data: habilidad });
    } catch (error) {
      return this.manejarError(res, error);
    }
  };

  listar = (req, res) => {
    try {
      const paginacion = this.extraerPaginacion(req.query);
      return this.responderPaginado(res, this.habilidadService.listar(paginacion));
    } catch (error) {
      return this.manejarError(res, error);
    }
  };
}
