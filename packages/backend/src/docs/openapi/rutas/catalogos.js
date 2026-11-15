// Parte de la especificacion OpenAPI. El documento se arma en ../index.js.

export const rutasCatalogos = {
  "/catalogos/provincias": {
    get: {
      tags: ["Colectivos"],
      summary: "Provincias validas para una ubicacion",
      description:
        "Las 23 provincias, tal como se guardan (sin tildes). Al cargar una ubicacion " +
        "se aceptan tambien con tildes o en minusculas y se guardan con el nombre del catalogo.",
      responses: {
        200: {
          description: "Lista de nombres.",
          content: {
            "application/json": {
              schema: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    },
  },
};
