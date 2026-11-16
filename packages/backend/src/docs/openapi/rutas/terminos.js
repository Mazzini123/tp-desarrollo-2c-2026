// Parte de la especificacion OpenAPI. El documento se arma en ../index.js.

import { errores, recurso } from "../comunes.js";

export const rutasTerminos = {
  "/terminos": {
    get: {
      tags: ["Terminos"],
      summary: "Terminos y condiciones vigentes",
      description:
        "Publico (adicional 21). Devuelve la ultima version publicada por administracion. " +
        "404 si todavia no se publico ninguna: en ese caso crear proyectos no exige nada. " +
        "Con terminos vigentes, POST /colectivos/{id}/proyectos exige `terminosAceptados` " +
        "igual a `version`.",
      security: [],
      responses: { ...recurso("Terminos"), 404: errores[404], 429: errores[429] },
    },
  },
};
