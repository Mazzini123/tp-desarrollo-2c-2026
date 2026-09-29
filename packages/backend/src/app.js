import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";

import { crearRouter } from "./routes/router.js";
import { noEncontrado } from "./middlewares/noEncontrado.js";
import { manejadorErrores } from "./middlewares/manejadorErrores.js";
import { sanitizarBody } from "./middlewares/sanitizar.js";
import { crearLimitadores, limitesDesdeEntorno } from "./middlewares/limiteDeTasa.js";
import { openapi } from "./docs/openapi.js";

// Rutas de busqueda: ademas del limite general, tienen uno propio mas bajo.
export const RUTAS_DE_BUSQUEDA = ["/proyectos/:id/perfiles/:perfilId/colaboradoras-potenciales"];

export function crearApp(controllers, { limites = limitesDesdeEntorno() } = {}) {
  const app = express();
  const limitadores = crearLimitadores(limites);

  app.use(limitadores.general);
  app.use(RUTAS_DE_BUSQUEDA, limitadores.busquedas);

  app.use(express.json());
  app.use(sanitizarBody);
  app.use(cors());

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));
  app.get("/openapi.json", (_req, res) => res.json(openapi));

  app.use(crearRouter(controllers));

  app.use(noEncontrado);
  app.use(manejadorErrores);

  return app;
}
