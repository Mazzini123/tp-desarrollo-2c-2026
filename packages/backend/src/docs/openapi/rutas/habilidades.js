// Parte de la especificacion OpenAPI. El documento se arma en ../index.js.

import { paramsPaginacion, listado } from "../comunes.js";

export const rutasHabilidades = {
  "/habilidades": {
    get: {
      tags: ["Habilidades"],
      summary: "Listar habilidades",
      description:
        "El catalogo lo carga el equipo administrativo con el seed: la API no expone altas.",
      parameters: paramsPaginacion,
      responses: listado("Habilidad"),
    },
  },
};
