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
              "PROYECTO_PUBLICADO",
              "PUBLICACION_RECHAZADA",
              "TERMINOS_ACTUALIZADOS",
              "PROYECTO_DADO_DE_BAJA",
              "COLECTIVO_DADO_DE_BAJA",
            ],
          },
        },
        {
          name: "entidadTipo",
          in: "query",
          schema: {
            type: "string",
            enum: ["PROYECTO", "REVISION", "USUARIO", "COLECTIVO", "TERMINOS"],
          },
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
        `${REQUIERE_ADMINISTRACION} Permiso: REVISION_VER. Motivos: SIN_ACTUALIZACIONES ` +
        "(proyectos abiertos con colaboraciones aceptadas que no tienen avances ni logros " +
        "nuevos en `DIAS_SIN_ACTUALIZACIONES` dias, 30 por defecto; un job las crea solo, " +
        "sin duplicarlas y sin avisar a nadie) y PUBLICACION (un colectivo pidio publicar " +
        "un borrador con POST /proyectos/{id}/publicacion).",
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
          schema: { type: "string", enum: ["SIN_ACTUALIZACIONES", "PUBLICACION"] },
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
        "proyecto. 409 si la revision ya estaba resuelta. Con motivo PUBLICACION: REVISADA " +
        "publica el proyecto (pasa a ABIERTO, avisa a las compatibles, audita " +
        "PROYECTO_PUBLICADO) y DESCARTADA lo vuelve a BORRADOR con la nota visible para el " +
        "colectivo (audita PUBLICACION_RECHAZADA). 409 si el proyecto ya no esta EN_REVISION; " +
        "422 si al aprobar la fecha de cierre ya paso.",
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

  "/administracion/proyectos/destacados": {
    get: {
      tags: ["Administracion"],
      summary: "Destacados vigentes, con su vencimiento",
      description:
        `${REQUIERE_ADMINISTRACION} Permiso: PROYECTO_DESTACAR. Los mismos proyectos y en ` +
        "el mismo orden que GET /proyectos/destacados, pero `destacado` trae " +
        "`{ desde, hasta }` en lugar de `true`, y cada uno suma `conflictoDeIntereses` " +
        "(true si quien consulta es lider o miembro del colectivo: quitarlo o cambiarlo " +
        "daria 422 CONFLICTO_DE_INTERESES).",
      responses: {
        200: {
          description:
            "Lista sin paginar (maximo `MAX_DESTACADOS_ACTIVOS`, 6 por defecto).",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/DestacadoParaAdministracion" },
              },
            },
          },
        },
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

  "/administracion/terminos": {
    put: {
      tags: ["Administracion", "Terminos"],
      summary: "Publicar una version nueva de los terminos y condiciones",
      description:
        `${REQUIERE_ADMINISTRACION} Permiso: TERMINOS_GESTIONAR. Crea la version siguiente ` +
        "(la primera es 1) y la deja vigente; las anteriores quedan como historial. El texto " +
        "es Markdown y se sanitiza. Audita TERMINOS_ACTUALIZADOS (entidad TERMINOS, detalle " +
        "{ version }). 409 si otra version se publico al mismo tiempo.",
      requestBody: body("PublicarTerminos"),
      responses: {
        ...recurso("TerminosPublicados", 201, "Version publicada."),
        400: errores[400],
        409: errores[409],
        ...respuestasDeAdministracion,
      },
    },
  },

  "/administracion/proyectos": {
    get: {
      tags: ["Administracion"],
      summary: "Listar proyectos para dar de baja",
      description:
        `${REQUIERE_ADMINISTRACION} Permiso: BAJA_POR_INFRACCION. Trae los proyectos en ` +
        "BORRADOR, EN_REVISION, ABIERTO y FINALIZADO de todos los colectivos (nunca los " +
        "DADO_DE_BAJA), del mas antiguo al mas nuevo. `conflictoDeIntereses` es true en los " +
        "proyectos de colectivos donde quien consulta es lider o miembro: darlos de baja da " +
        "422 CONFLICTO_DE_INTERESES (adicional 21).",
      parameters: [
        ...paramsPaginacion,
        {
          name: "q",
          in: "query",
          description:
            "Busca en el titulo del proyecto o en el nombre del colectivo, sin distinguir " +
            "mayusculas ni tildes. Hasta 80 caracteres.",
          schema: { type: "string", minLength: 1, maxLength: 80 },
        },
        {
          name: "etiqueta",
          in: "query",
          description: "Etiqueta exacta del proyecto (se normaliza como al guardarla).",
          schema: { type: "string" },
        },
        {
          name: "estado",
          in: "query",
          description: "Sin estado trae los cuatro. DADO_DE_BAJA da 400.",
          schema: {
            type: "string",
            enum: ["BORRADOR", "EN_REVISION", "ABIERTO", "FINALIZADO"],
          },
        },
      ],
      responses: {
        ...listado("ProyectoParaBaja"),
        400: errores[400],
        ...respuestasDeAdministracion,
      },
    },
  },

  "/administracion/proyectos/{id}/baja": {
    post: {
      tags: ["Administracion"],
      summary: "Dar de baja un proyecto por infraccion",
      description:
        `${REQUIERE_ADMINISTRACION} Permiso: BAJA_POR_INFRACCION. El proyecto pasa a ` +
        "DADO_DE_BAJA: sale de toda lectura publica (como un borrador) y el colectivo ve el " +
        "motivo en `baja` del detalle. Rechaza las postulaciones pendientes, finaliza las " +
        "colaboraciones aceptadas (avisando como al cerrarlo) y descarta sus revisiones " +
        "pendientes con el motivo como nota. Audita PROYECTO_DADO_DE_BAJA (detalle " +
        "{ motivo }). 409 si ya estaba dado de baja. 422 CONFLICTO_DE_INTERESES si quien " +
        "lo hace es lider o miembro del colectivo.",
      parameters: [paramId],
      requestBody: body("BajaPorInfraccion"),
      responses: {
        ...recurso("BajaDeProyecto"),
        400: errores[400],
        404: errores[404],
        409: errores[409],
        422: errores[422],
        ...respuestasDeAdministracion,
      },
    },
  },

  "/administracion/colectivos/{id}/baja": {
    post: {
      tags: ["Administracion"],
      summary: "Dar de baja un colectivo por infraccion",
      description:
        `${REQUIERE_ADMINISTRACION} Permiso: BAJA_POR_INFRACCION. Hace la misma baja que ` +
        "POST /colectivos/{id}/baja (cierra sus proyectos abiertos, cancela solicitudes y " +
        "desactiva los contextos de sus miembros) y audita COLECTIVO_DADO_DE_BAJA (entidad " +
        "COLECTIVO, detalle { motivo }). 409 si ya estaba dado de baja. 422 " +
        "CONFLICTO_DE_INTERESES si quien lo hace es lider o miembro del colectivo.",
      parameters: [paramId],
      requestBody: body("BajaPorInfraccion"),
      responses: {
        ...recurso("BajaDeColectivo"),
        400: errores[400],
        404: errores[404],
        409: errores[409],
        422: errores[422],
        ...respuestasDeAdministracion,
      },
    },
  },
};
