import { BaseController } from "./BaseController.js";

export class NotificacionController extends BaseController {
  constructor({ notificacionService }) {
    super();
    this.notificacionService = notificacionService;
  }

  listar = async (req, res) => {
    const paginacion = this.aPaginacionDeDominio(req.consulta);
    const { leida } = req.consulta;
    const { noLeidas, ...pagina } = await this.notificacionService.listar(req.params.id, {
      ...paginacion,
      leida,
    });
    this.responderPaginado(res, pagina, { unread: noLeidas });
  };

  marcarComoLeida = async (req, res) => {
    res
      .status(200)
      .json(
        await this.notificacionService.marcarComoLeida(
          req.params.id,
          req.params.notificacionId,
        ),
      );
  };
}
