import { BaseController } from "./BaseController.js";

export class TerminosController extends BaseController {
  constructor({ terminosService }) {
    super();
    this.terminosService = terminosService;
  }

  vigente = async (_req, res) => {
    res.status(200).json(await this.terminosService.obtenerVigente());
  };
}
