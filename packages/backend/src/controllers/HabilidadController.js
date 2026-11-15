import { BaseController } from "./BaseController.js";

export class HabilidadController extends BaseController {
  constructor({ habilidadService }) {
    super();
    this.habilidadService = habilidadService;
  }

  listar = async (req, res) => {
    const paginacion = this.aPaginacionDeDominio(req.consulta);
    this.responderPaginado(res, await this.habilidadService.listar(paginacion));
  };
}
