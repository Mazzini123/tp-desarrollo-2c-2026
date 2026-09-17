import { BaseController } from "./BaseController.js";

export class HealthController extends BaseController {
  check = (_req, res) => {
    res.status(200).json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  };
}
