// Parte de la especificacion OpenAPI. El documento se arma en ../index.js.

import { errores, recurso } from "../comunes.js";

export const rutasEstadisticas = {
  "/estadisticas": {
    get: {
      tags: ["Estadisticas"],
      summary: "Estadisticas globales de la plataforma",
      description:
        "Req. adicionales 16 y 30: API publica con metricas globales. Se puede cachear un " +
        "minuto (`Cache-Control: public, max-age=60`).",
      responses: { ...recurso("EstadisticasGlobales"), 429: errores[429] },
    },
  },
};
