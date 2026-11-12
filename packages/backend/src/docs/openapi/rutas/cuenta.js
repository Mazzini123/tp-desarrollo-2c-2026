// Parte de la especificacion OpenAPI. El documento se arma en ../index.js.

import { OBJECT_ID, errores } from "../comunes.js";

export const rutasCuenta = {
  "/auth/registro": {
    post: {
      tags: ["Cuenta"],
      summary: "Registrar al usuario del token",
      description:
        "Solo pide un access token valido y no lleva body. Crea el usuario interno y su " +
        "identidad externa (proveedor + sub) si no existen. Idempotente: llamarlo de " +
        "nuevo, o varias veces a la vez, no duplica nada. Se llama al iniciar la sesion " +
        "antes de consultar GET /auth/me. No requiere ni crea un contexto. " +
        "El nombre se completa mediante PUT /auth/usuario.",
      responses: {
        201: { description: "Usuario creado. `{ usuarioId, creado: true }`" },
        200: { description: "Ya estaba registrado. `{ usuarioId, creado: false }`" },
        401: { description: "Sin token o token invalido." },
        503: { description: "El proveedor de claves no esta disponible." },
      },
    },
  },

  "/auth/me": {
    get: {
      tags: ["Cuenta"],
      summary: "Cuenta, contexto actual y contextos disponibles",
      description:
        "Consulta de solo lectura para un usuario registrado. Funciona sin contexto actual. " +
        "`id` conserva el sub por compatibilidad. El identificador interno es `usuario.id`. " +
        "`rol` y `perfilId` corresponden al contexto actual. `contextos` lista los contextos " +
        "activos cuya entidad asociada sigue activa. Cada contexto trae sus `permisos`. 403 " +
        "USUARIO_NO_REGISTRADO si falta `POST /auth/registro`.",
      responses: {
        200: {
          description: "Cuenta.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  id: { type: "string", description: "`sub` del token." },
                  rol: {
                    type: "string",
                    enum: ["COLECTIVO", "COLABORADORA"],
                    nullable: true,
                  },
                  perfilId: { ...OBJECT_ID, nullable: true },
                  usuario: {
                    type: "object",
                    properties: {
                      id: OBJECT_ID,
                      nombre: { type: "string", nullable: true },
                      nombrePendiente: {
                        type: "boolean",
                        description:
                          "true mientras no cargo su nombre: el front se lo pide.",
                      },
                    },
                  },
                  contextoActual: { $ref: "#/components/schemas/Contexto" },
                  contextos: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Contexto" },
                  },
                },
              },
            },
          },
        },
        401: { description: "Sin sesion o sesion invalida." },
        403: { description: "USUARIO_NO_REGISTRADO." },
      },
    },
  },

  "/auth/usuario": {
    put: {
      tags: ["Cuenta"],
      summary: "Completar o cambiar el nombre del usuario",
      description:
        "El nombre es un dato de la aplicacion, no del proveedor de identidad. Hace falta " +
        "antes de crear un colectivo o pedir el ingreso a uno (409 NOMBRE_REQUERIDO). Es " +
        "el que se muestra en miembros y solicitudes.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["nombre"],
              properties: { nombre: { type: "string", minLength: 1, maxLength: 80 } },
            },
          },
        },
      },
      responses: {
        200: { description: "`{ id, nombre }`" },
        400: errores[400],
      },
    },
  },

  "/auth/contexto-actual": {
    put: {
      tags: ["Cuenta"],
      summary: "Elegir el contexto con el que se opera",
      description:
        "El contexto tiene que ser del usuario y estar activo. Es uno solo por usuario: " +
        "cambiarlo afecta a todas sus ventanas y dispositivos, que reciben 409 " +
        "CONTEXTO_NO_ACTUAL hasta recargar la cuenta.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["contextoId"],
              properties: { contextoId: OBJECT_ID },
            },
          },
        },
      },
      responses: {
        200: {
          description: "El contexto elegido, con sus permisos.",
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/Contexto" } },
          },
        },
        403: {
          description: "CONTEXTO_INVALIDO (inexistente o ajeno) o CONTEXTO_INACTIVO.",
        },
      },
    },
    delete: {
      tags: ["Cuenta"],
      summary: "Dejar al usuario sin contexto actual (cierre de sesion)",
      description:
        "El front lo intenta antes de cerrar la sesion; si falla, no es grave.",
      responses: { 204: { description: "Sin contexto actual." } },
    },
  },

  "/auth/solicitudes-ingreso": {
    get: {
      tags: ["Membresias"],
      summary: "Mis solicitudes de ingreso",
      responses: {
        200: { description: "Solicitudes del usuario, la mas nueva primero." },
      },
    },
  },
};
