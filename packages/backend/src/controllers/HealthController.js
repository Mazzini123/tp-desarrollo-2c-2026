import { BaseController } from "./BaseController.js";

export class HealthController extends BaseController {
  /**
   * Correccion A3: antes devolvia { status: "success", data: { status: "ok" } }
   * — el mismo campo anidado dos veces con dos significados distintos. El
   * `status` de afuera se fue; el de adentro se queda, porque ese si dice algo:
   * es el estado del servicio, no el de la request.
   */
  check = (_req, res) => {
    res.status(200).json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  };
}
