import { BaseController } from "./BaseController.js";

// Acciones sobre una colaboracion ya creada (una postulacion).
export class PostulacionController extends BaseController {
  constructor({ colaboracionService }) {
    super();
    this.colaboracionService = colaboracionService;
  }

  aceptar = async (req, res) => {
    res
      .status(200)
      .json(await this.colaboracionService.aceptar(req.params.id, req.params.colaboracionId));
  };

  rechazar = async (req, res) => {
    res
      .status(200)
      .json(await this.colaboracionService.rechazar(req.params.id, req.params.colaboracionId));
  };

  finalizar = async (req, res) => {
    res
      .status(200)
      .json(await this.colaboracionService.finalizar(req.params.id, req.params.colaboracionId));
  };

  valorar = async (req, res) => {
    res
      .status(201)
      .json(
        await this.colaboracionService.valorar(
          req.params.id,
          req.params.colaboracionId,
          req.body,
        ),
      );
  };
}
