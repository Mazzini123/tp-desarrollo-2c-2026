import { BaseController } from "./BaseController.js";

export class HabilidadController extends BaseController {
  constructor({ habilidadService }) {
    super();
    this.habilidadService = habilidadService;
  }

  crear = (req, res) => {
    res.status(201).json(this.habilidadService.crear(req.body));
  };

  listar = (req, res) => {
    const paginacion = this.aPaginacionDeDominio(req.paginacion);
    this.responderPaginado(res, this.habilidadService.listar(paginacion));
  };
}
