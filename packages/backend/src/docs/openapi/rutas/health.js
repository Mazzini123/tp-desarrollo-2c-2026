// Parte de la especificacion OpenAPI. El documento se arma en ../index.js.

export const rutasHealth = {
  "/ready": {
    get: {
      tags: ["Health"],
      summary: "Readiness de MongoDB",
      security: [],
      responses: {
        200: { description: "MongoDB conectado y responde al ping." },
        503: { description: "Base no disponible o ping agotado." },
      },
    },
  },
  "/health": {
    get: {
      tags: ["Health"],
      summary: "Health check",
      responses: {
        200: {
          description: "El servicio responde.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", example: "ok" },
                  uptime: {
                    type: "number",
                    description: "Segundos desde que arranco el proceso.",
                  },
                  timestamp: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
      },
    },
  },
};
