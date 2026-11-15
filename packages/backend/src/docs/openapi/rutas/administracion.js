// Parte de la especificacion OpenAPI. El documento se arma en ../index.js.

import {
  OBJECT_ID,
  errores,
  paramId,
  paramsPaginacion,
  listado,
  recurso,
  body,
} from "../comunes.js";

const REQUIERE_ADMINISTRACION =
  "Requiere el contexto de ADMINISTRACION (`X-Context-Id`) con el permiso indicado. " +
  "Cualquier otro contexto recibe 403 PERMISO_INSUFICIENTE.";

const respuestasDeAdministracion = {
  401: { description: "Sin sesion o sesion invalida." },
  403: { description: "El contexto no tiene el permiso, o no hay contexto valido." },
  429: errores[429],
};

export const rutasAdministracion = {
  "/administracion/auditoria": {
    get: {
      tags: ["Administracion"],
      summary: "Registro de acciones administrativas",
      description: `${REQUIERE_ADMINISTRACION} Permiso: AUDITORIA_VER. Del mas reciente al mas antiguo.`,
      parameters: [
        ...paramsPaginacion,
        {
          name: "accion",
          in: "query",
          schema: {
            type: "string",
            enum: [
              "PROYECTO_DESTACADO",
              "PROYECTO_DESTACADO_QUITADO",
              "REVISION_RESUELTA",
              "ADMIN_OTORGADO",
            ],
          },
        },
        {
          name: "entidadTipo",
          in: "query",
          schema: { type: "string", enum: ["PROYECTO", "REVISION", "USUARIO"] },
        },
        { name: "entidadId", in: "query", schema: OBJECT_ID },
        { name: "desde", in: "query", schema: { type: "string", format: "date-time" } },
        { name: "hasta", in: "query", schema: { type: "string", format: "date-time" } },
      ],
      responses: { ...listado("AccionAdministrativa"), ...respuestasDeAdministracion },
    },
  },

  "/administracion/revisiones": {
    get: {
      tags: ["Administracion"],
      summary: "Cola de revisiones manuales",
      description:
        `${REQUIERE_ADMINISTRACION} Permiso: REVISION_VER. Hoy solo existe el motivo ` +
        "SIN_ACTUALIZACIONES: proyectos abiertos con colaboraciones aceptadas que no " +
        "tienen avances ni logros nuevos en `DIAS_SIN_ACTUALIZACIONES` dias (30 por defecto). " +
        "Un job las crea solo, sin duplicarlas y sin avisar a nadie.",
      parameters: [
        ...paramsPaginacion,
        {
          name: "estado",
          in: "query",
          schema: { type: "string", enum: ["PENDIENTE", "REVISADA", "DESCARTADA"] },
        },
        {
          name: "motivo",
          in: "query",
          schema: { type: "string", enum: ["SIN_ACTUALIZACIONES"] },
        },
      ],
      responses: { ...listado("Revision"), ...respuestasDeAdministracion },
    },
  },

  "/administracion/revisiones/{id}/resolucion": {
    post: {
      tags: ["Administracion"],
      summary: "Resolver una revision",
      description:
        `${REQUIERE_ADMINISTRACION} Permiso: REVISION_RESOLVER. Queda auditado. ` +
        "422 CONFLICTO_DE_INTERESES si quien resuelve es lider o miembro del colectivo del " +
        "proyecto. 409 si la revision ya estaba resuelta.",
      parameters: [paramId],
      requestBody: body("ResolverRevision"),
      responses: {
        ...recurso("Revision"),
        400: errores[400],
        404: errores[404],
        409: errores[409],
        422: errores[422],
        ...respuestasDeAdministracion,
      },
    },
  },

  "/administracion/proyectos/{id}/destacado": {
    put: {
      tags: ["Administracion"],
      summary: "Destacar un proyecto, o cambiar el vencimiento",
      description:
        `${REQUIERE_ADMINISTRACION} Permiso: PROYECTO_DESTACAR. Solo proyectos abiertos de ` +
        "un colectivo activo, con un vencimiento futuro. Como maximo " +
        "`MAX_DESTACADOS_ACTIVOS` vigentes a la vez (6 por defecto): 409 si se supera. " +
        "422 CONFLICTO_DE_INTERESES si quien destaca es lider o miembro del colectivo. " +
        "Vencido el plazo, el proyecto deja de listarse como destacado solo.",
      parameters: [paramId],
      requestBody: body("DestacarProyecto"),
      responses: {
        ...recurso("DestacadoDeProyecto"),
        400: errores[400],
        404: errores[404],
        409: errores[409],
        422: errores[422],
        ...respuestasDeAdministracion,
      },
    },
    delete: {
      tags: ["Administracion"],
      summary: "Quitar el destacado de un proyecto",
      description: `${REQUIERE_ADMINISTRACION} Permiso: PROYECTO_DESTACAR. Queda auditado.`,
      parameters: [paramId],
      responses: {
        204: { description: "Destacado quitado." },
        404: errores[404],
        422: errores[422],
        ...respuestasDeAdministracion,
      },
    },
  },

  "/administracion/administradores": {
    post: {
      tags: ["Administracion"],
      summary: "Otorgar el rol de administracion a una cuenta",
      description:
        `${REQUIERE_ADMINISTRACION} Permiso: ADMIN_GESTIONAR. El primer administrador se ` +
        "crea con el comando `npm run admin:otorgar`. Repetirlo no duplica el contexto.",
      requestBody: body("OtorgarAdministrador"),
      responses: {
        201: { description: "Rol otorgado. `{ usuarioId, contextoId, creado: true }`" },
        200: { description: "Ya era administradora. `{ usuarioId, creado: false }`" },
        400: errores[400],
        404: errores[404],
        ...respuestasDeAdministracion,
      },
    },
  },
};
