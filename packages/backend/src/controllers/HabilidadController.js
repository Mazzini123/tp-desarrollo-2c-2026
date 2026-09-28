import { BaseController } from "./BaseController.js";

export class HabilidadController extends BaseController {
  constructor({ habilidadService }) {
    super();
    this.habilidadService = habilidadService;
  }

  crear = async (req, res) => {
    res.status(201).json(await this.habilidadService.crear(req.body));
  };

  listar = async (req, res) => {
    const paginacion = this.aPaginacionDeDominio(req.paginacion);
    this.responderPaginado(res, await this.habilidadService.listar(paginacion));
  };
}