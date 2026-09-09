import { BaseController } from "./BaseController.js";

export class HealthController extends BaseController {
  check = (req, res) => {
    return res.status(200).json({
      status: "success",
      data: { status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() },
    });
  };
}
