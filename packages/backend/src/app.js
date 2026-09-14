import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";

import { crearRouter } from "./routes/router.js";
import { noEncontrado } from "./middlewares/noEncontrado.js";
import { manejadorErrores } from "./middlewares/manejadorErrores.js";
import { openapi } from "./docs/openapi.js";

/**
 * Arma la app de Express a partir de controllers ya construidos.
 *
 * El orden de los `use` es lo que hace funcionar el manejo de errores
 * (correccion A1):
 *
 *   1. express.json()          parsea el body (y tira SyntaxError si viene roto)
 *   2. /docs                   Swagger UI (correccion E2)
 *   3. router                  las rutas reales
 *   4. noEncontrado            3 parametros: atiende lo que no matcheo ninguna ruta
 *   5. manejadorErrores        4 parametros: Express le trae TODOS los errores
 *
 * Express saltea los middlewares de 3 parametros cuando viaja un error y va
 * derecho al primero que declare 4. Por eso el manejador va ultimo.
 */
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
