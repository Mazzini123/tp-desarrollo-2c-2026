import { BaseController } from "./BaseController.js";
import mongoose from "mongoose";

export class HealthController extends BaseController {
  ready = async (_req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) throw new Error("Base no conectada");
      await mongoose.connection.db.command({ ping: 1 }, { timeoutMS: 2_000 });
      res.status(200).json({ status: "ready" });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  };

  check = (_req, res) => {
    res.status(200).json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  };
}
