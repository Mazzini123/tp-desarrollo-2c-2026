import { BaseController } from "./BaseController.js";

export class NotificacionController extends BaseController {
  constructor({ notificacionService }) {
    super();
    this.notificacionService = notificacionService;
  }

  listar = async (req, res) => {
    const paginacion = this.aPaginacionDeDominio(req.paginacion);
    this.responderPaginado(
      res,
      await this.notificacionService.listar(req.params.id, paginacion),
    );
  };

  marcarComoLeida = async (req, res) => {
    res
      .status(200)
      .json(
        await this.notificacionService.marcarComoLeida(req.params.id, req.params.notificacionId),
      );
  };
}
