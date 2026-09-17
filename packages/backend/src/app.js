import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";

import { crearRouter } from "./routes/router.js";
import { noEncontrado } from "./middlewares/noEncontrado.js";
import { manejadorErrores } from "./middlewares/manejadorErrores.js";
import { openapi } from "./docs/openapi.js";

export function crearApp(controllers) {
  const app = express();

  app.use(express.json());
  app.use(cors());

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));
  app.get("/openapi.json", (_req, res) => res.json(openapi));

  app.use(crearRouter(controllers));

  app.use(noEncontrado);
  app.use(manejadorErrores);

  return app;
}
