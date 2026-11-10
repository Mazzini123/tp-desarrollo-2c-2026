import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";

import { crearRouter } from "./routes/router.js";
import { noEncontrado } from "./middlewares/noEncontrado.js";
import { manejadorErrores } from "./middlewares/manejadorErrores.js";
import { sanitizarBody } from "./middlewares/sanitizar.js";
import { crearLimitadores, limitesDesdeEntorno } from "./middlewares/limiteDeTasa.js";
import { openapi } from "./docs/openapi/index.js";

export const RUTAS_DE_BUSQUEDA = [
  "/proyectos/:id/perfiles/:perfilId/colaboradoras-potenciales",
  "/colaboradores/:id/proyectos-potenciales",
  "/estadisticas",
  "/colectivos/:id/estadisticas",
];

// Sin CORS_ORIGENES se acepta cualquier origen, como hasta ahora.
function opcionesDeCors(entorno = process.env) {
  const origenes = entorno.CORS_ORIGENES?.split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return {
    origin: origenes?.length ? origenes : true,
    allowedHeaders: ["Authorization", "Content-Type", "Idempotency-Key", "X-Context-Id"],
    exposedHeaders: ["Deprecation", "RateLimit", "RateLimit-Policy", "Retry-After"],
  };
}

export function crearApp(
  controllers,
  { limites = limitesDesdeEntorno(), autorizacion } = {},
) {
  const app = express();
  const limitadores = crearLimitadores(limites);

  app.use(cors(opcionesDeCors()));

  app.use(limitadores.general);
  app.use(RUTAS_DE_BUSQUEDA, limitadores.busquedas);

  app.use(express.json());
  app.use(sanitizarBody);

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));
  app.get("/openapi.json", (_req, res) => res.json(openapi));

  app.use(crearRouter(controllers, autorizacion));

  app.use(noEncontrado);
  app.use(manejadorErrores);

  return app;
}
