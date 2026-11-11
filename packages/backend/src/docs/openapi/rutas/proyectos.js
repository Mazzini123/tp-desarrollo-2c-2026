// Parte de la especificacion OpenAPI. El documento se arma en ../index.js.

import {
  OBJECT_ID,
  errores,
  paramsFiltroDeProyectos,
  paramColaboracionId,
  paramCodigoHabilidad,
  paramPerfilId,
  arrayDe,
  paramsPaginacion,
  paramId,
  listado,
  recurso,
  body,
} from "../comunes.js";

export const rutasProyectos = {
  "/proyectos": {
    get: {
      tags: ["Proyectos"],
      summary: "Listar proyectos",
      description:
        "Todos los proyectos de todos los colectivos, en orden de creacion. " +
        "Los filtros se combinan con AND.",
      parameters: [...paramsPaginacion, ...paramsFiltroDeProyectos],
      responses: listado("ResumenProyecto"),
    },
  },

  "/proyectos/{id}": {
    parameters: [paramId],
    get: {
      tags: ["Proyectos"],
      summary: "Obtener proyecto",
      description:
        "Devuelve la primera página de 20 participaciones y colaboracionesMeta. El dueño ve " +
        "postulaciones privadas; el público solo ACEPTADA/FINALIZADA. Los anónimos nunca " +
        "revelan identidad. Las visitas del contexto del colectivo dueño no suman visualizaciones.",
      responses: { ...recurso("Proyecto"), 404: errores[404] },
    },
    put: {
      tags: ["Proyectos"],
      summary: "Actualizar proyecto",
      description:
        "Todos los campos son opcionales. `fechaCierre: null` saca la fecha " +
        "de cierre; si viene, tiene que ser futura (422). Un proyecto finalizado no se puede modificar: responde 409.",
      requestBody: body("ActualizarProyecto"),
      responses: {
        ...recurso("Proyecto"),
        400: errores[400],
        422: errores[422],
        404: errores[404],
        409: errores[409],
      },
    },
  },

  "/proyectos/{id}/colaboradores/{colaboradorId}/contacto": {
    get: {
      tags: ["Postulaciones"],
      summary: "Medios de contacto de una persona aceptada",
      description:
        "Solo con la autenticacion activa y solo para el colectivo dueño del proyecto. 403 si " +
        "la persona no tiene una colaboracion aceptada y publica en el proyecto (una " +
        "postulacion anonima nunca revela su contacto). Sin autenticacion la ruta no existe (404).",
      parameters: [
        paramId,
        { name: "colaboradorId", in: "path", required: true, schema: OBJECT_ID },
      ],
      responses: {
        200: {
          description: "Medios de contacto.",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/MedioDeContacto" },
              },
            },
          },
        },
        401: { description: "Sin sesion." },
        403: {
          description: "No es el dueño o no hay colaboracion aceptada y publica.",
        },
        404: errores[404],
      },
    },
  },

  "/proyectos/{id}/perfiles": {
    parameters: [paramId],
    post: {
      tags: ["Perfiles"],
      summary: "Agregar un perfil al proyecto",
      description:
        "Las habilidades se indican por codigo y tienen que existir en el catalogo (404) y " +
        "estar activas (422). Una habilidad no puede ser requerida y opcional a la vez (422). " +
        "Si el proyecto esta finalizado, 409.",
      requestBody: body("CrearPerfil"),
      responses: {
        ...recurso("Perfil", 201, "Perfil creado."),
        400: errores[400],
        422: errores[422],
        404: errores[404],
        409: errores[409],
      },
    },
    get: {
      tags: ["Perfiles"],
      summary: "Listar los perfiles del proyecto",
      responses: { ...arrayDe("Perfil", "Perfiles del proyecto."), 404: errores[404] },
    },
  },

  "/proyectos/{id}/perfiles/{perfilId}": {
    parameters: [paramId, paramPerfilId],
    get: {
      tags: ["Perfiles"],
      summary: "Obtener un perfil",
      responses: { ...recurso("Perfil"), 404: errores[404] },
    },
    put: {
      tags: ["Perfiles"],
      summary: "Actualizar un perfil",
      description:
        "Actualizacion parcial: se manda solo lo que cambia, pero al menos un campo (400 si " +
        "viene vacio). Para reemplazar habilidades, enviar ambos grupos de codigos y la " +
        "`versionEdicion` del perfil leído (400 si falta alguno). Los grupos y los otros campos se guardan juntos. " +
        "Una version desactualizada responde 409. Cambiar " +
        "`modoAceptacion` o `limiteColaboraciones` resuelve las postulaciones pendientes del " +
        "perfil con las reglas nuevas; el limite no puede quedar por debajo de las ya " +
        "aceptadas (422). Si el proyecto esta finalizado, 409.",
      requestBody: body("ActualizarPerfil"),
      responses: {
        ...recurso("Perfil"),
        400: errores[400],
        422: errores[422],
        404: errores[404],
        409: errores[409],
      },
    },
    delete: {
      tags: ["Perfiles"],
      summary: "Eliminar un perfil",
      description:
        "El proyecto tiene que conservar al menos un perfil: borrar el ultimo responde 422. " +
        "Si el proyecto está finalizado o el perfil tiene historial de colaboraciones, 409.",
      responses: {
        204: { description: "Perfil eliminado." },
        400: errores[400],
        422: errores[422],
        404: errores[404],
        409: errores[409],
      },
    },
  },

  "/proyectos/{id}/perfiles/{perfilId}/habilidades-requeridas": {
    parameters: [paramId, paramPerfilId],
    post: {
      tags: ["Perfiles"],
      summary: "Agregar una habilidad requerida",
      description:
        "409 si la habilidad ya es requerida u opcional en el perfil. 404 si el codigo no " +
        "existe en el catalogo y 422 si esta dado de baja.",
      requestBody: body("HabilidadDePerfil"),
      responses: {
        ...recurso("Perfil", 200, "Perfil actualizado."),
        400: errores[400],
        422: errores[422],
        404: errores[404],
        409: errores[409],
      },
    },
  },

  "/proyectos/{id}/perfiles/{perfilId}/habilidades-requeridas/{codigoHabilidad}": {
    parameters: [paramId, paramPerfilId, paramCodigoHabilidad],
    delete: {
      tags: ["Perfiles"],
      summary: "Quitar una habilidad requerida",
      description:
        "El perfil tiene que conservar al menos una habilidad requerida: quitar la ultima " +
        "responde 422. 404 si la habilidad no es requerida en el perfil.",
      responses: {
        ...recurso("Perfil", 200, "Perfil actualizado."),
        400: errores[400],
        422: errores[422],
        404: errores[404],
        409: errores[409],
      },
    },
  },

  "/proyectos/{id}/perfiles/{perfilId}/habilidades-opcionales": {
    parameters: [paramId, paramPerfilId],
    post: {
      tags: ["Perfiles"],
      summary: "Agregar una habilidad opcional",
      description:
        "409 si la habilidad ya es opcional o requerida en el perfil. 404 si el codigo no " +
        "existe en el catalogo y 422 si esta dado de baja.",
      requestBody: body("HabilidadDePerfil"),
      responses: {
        ...recurso("Perfil", 200, "Perfil actualizado."),
        400: errores[400],
        422: errores[422],
        404: errores[404],
        409: errores[409],
      },
    },
  },

  "/proyectos/{id}/perfiles/{perfilId}/habilidades-opcionales/{codigoHabilidad}": {
    parameters: [paramId, paramPerfilId, paramCodigoHabilidad],
    delete: {
      tags: ["Perfiles"],
      summary: "Quitar una habilidad opcional",
      description: "404 si la habilidad no es opcional en el perfil.",
      responses: {
        ...recurso("Perfil", 200, "Perfil actualizado."),
        404: errores[404],
        409: errores[409],
      },
    },
  },

  "/proyectos/{id}/logros": {
    parameters: [paramId],
    post: {
      tags: ["Proyectos"],
      summary: "Crear logro",
      requestBody: body("CrearLogro"),
      responses: {
        ...recurso("Logro", 201, "Logro creado."),
        400: errores[400],
        404: errores[404],
        409: errores[409],
      },
    },
    get: {
      tags: ["Proyectos"],
      summary: "Listar logros del proyecto",
      responses: {
        ...arrayDe("Logro", "Logros del proyecto."),
        404: errores[404],
      },
    },
  },

  "/proyectos/{id}/logros/{logroId}": {
    parameters: [
      paramId,
      {
        name: "logroId",
        in: "path",
        required: true,
        schema: OBJECT_ID,
      },
    ],
    get: {
      tags: ["Proyectos"],
      summary: "Obtener logro",
      responses: {
        ...recurso("Logro"),
        404: errores[404],
      },
    },
    put: {
      tags: ["Proyectos"],
      summary: "Actualizar logro",
      requestBody: body("ActualizarLogro"),
      responses: {
        ...recurso("Logro"),
        400: errores[400],
        404: errores[404],
        409: errores[409],
      },
    },
    delete: {
      tags: ["Proyectos"],
      summary: "Eliminar logro",
      responses: {
        204: { description: "Logro eliminado." },
        404: errores[404],
        409: errores[409],
      },
    },
  },

  "/proyectos/{id}/avances": {
    parameters: [paramId],
    post: {
      tags: ["Proyectos"],
      summary: "Registrar avance",
      description:
        "Agrega una entrada al historial de avances y actualiza el porcentaje de concrecion " +
        "y los enlaces actuales del proyecto. Los avances no se editan ni se borran: son la " +
        "trazabilidad del proyecto. El porcentaje tiene que superar al actual (422). Si el " +
        "proyecto esta finalizado, 409.",
      requestBody: body("CrearAvance"),
      responses: {
        ...recurso("Avance", 201, "Avance registrado."),
        400: errores[400],
        422: errores[422],
        404: errores[404],
        409: errores[409],
      },
    },
    get: {
      tags: ["Proyectos"],
      summary: "Listar avances del proyecto",
      responses: {
        ...arrayDe("Avance", "Historial de avances."),
        404: errores[404],
      },
    },
  },

  "/proyectos/{id}/avances/{avanceId}": {
    parameters: [
      paramId,
      {
        name: "avanceId",
        in: "path",
        required: true,
        schema: OBJECT_ID,
      },
    ],
    get: {
      tags: ["Proyectos"],
      summary: "Obtener avance",
      responses: {
        ...recurso("Avance"),
        404: errores[404],
      },
    },
  },

  "/proyectos/{id}/finalizacion": {
    parameters: [paramId],
    post: {
      tags: ["Proyectos"],
      summary: "Finalizar proyecto",
      description:
        "Crea el cierre del proyecto. Sin body. Es irreversible y tiene efectos en " +
        "cascada: se rechazan las postulaciones pendientes, terminan las colaboraciones " +
        "en curso (y desde ahi se pueden valorar), y el proyecto ya no admite " +
        "postulaciones ni cambios. Son las mismas consecuencias que el cierre automatico " +
        "por fecha (req. 10). Finalizar uno ya finalizado responde 409.",
      responses: {
        ...recurso("Proyecto", 200, "Proyecto finalizado."),
        404: errores[404],
        409: errores[409],
      },
    },
  },

  "/proyectos/{id}/colaboraciones": {
    parameters: [paramId],
    post: {
      tags: ["Proyectos"],
      summary: "Postularse al proyecto",
      description:
        "La persona se postula a un perfil (`perfilId`). Validaciones, en este orden: el " +
        "proyecto tiene que estar abierto (409 si no; si la fecha de cierre ya paso, se " +
        "cierra en el momento), el perfil tiene que existir (404) y tener la busqueda " +
        "abierta y sin vencer (409), la persona tiene que tener **todas** las habilidades " +
        "requeridas de ese perfil (422 si no), y no puede haberse postulado antes al " +
        "mismo perfil, salvo RETIRADA (409). La colaboracion queda PENDIENTE o se resuelve en el momento segun " +
        "el `modoAceptacion` del perfil. Con " +
        "`esPublica: false` la contribucion es anonima: figura, pero con `colaborador: null`.",
      requestBody: body("AnotarColaborador"),
      responses: {
        ...recurso("Colaboracion", 201, "Colaboracion registrada."),
        400: errores[400],
        422: errores[422],
        404: errores[404],
        409: errores[409],
      },
    },
    get: {
      tags: ["Postulaciones"],
      summary: "Listar postulaciones del proyecto, paginadas",
      description:
        "Solo el colectivo dueño con POSTULACION_RESOLVER. Incluye cualquier estado; oculta autores anónimos.",
      security: [{ bearerAuth: [], contexto: [] }],
      parameters: [
        ...paramsPaginacion,
        {
          name: "estado",
          in: "query",
          schema: {
            type: "string",
            enum: [
              "PENDIENTE",
              "ACEPTADA",
              "RECHAZADA",
              "FINALIZADA",
              "DESVINCULADA",
              "RETIRADA",
            ],
          },
        },
      ],
      responses: {
        ...listado("Colaboracion"),
        401: errores[401],
        403: errores[403],
        404: errores[404],
      },
    },
  },
  "/proyectos/{id}/participaciones": {
    get: {
      tags: ["Postulaciones"],
      summary: "Participaciones públicas paginadas",
      description:
        "Solo ACEPTADA/FINALIZADA. Las contribuciones anónimas figuran con colaborador null.",
      parameters: [paramId, ...paramsPaginacion],
      responses: { ...listado("Colaboracion"), 404: errores[404] },
    },
  },

  "/proyectos/{id}/colaboraciones/{colaboracionId}/aceptacion": {
    parameters: [paramId, paramColaboracionId],
    post: {
      tags: ["Postulaciones"],
      summary: "Aceptar una postulacion",
      description:
        "Solo una PENDIENTE, de un proyecto abierto y con vacantes (409 si no). Si con esta " +
        "se llena el cupo, en los modos automaticos se rechazan las pendientes restantes.",
      responses: {
        ...recurso("Colaboracion", 200, "Postulacion aceptada."),
        404: errores[404],
        409: errores[409],
      },
    },
  },

  "/proyectos/{id}/colaboraciones/{colaboracionId}/rechazo": {
    parameters: [paramId, paramColaboracionId],
    post: {
      tags: ["Postulaciones"],
      summary: "Rechazar una postulacion",
      description: "Solo una PENDIENTE, de un proyecto abierto (409 si no).",
      responses: {
        ...recurso("Colaboracion", 200, "Postulacion rechazada."),
        404: errores[404],
        409: errores[409],
      },
    },
  },

  "/proyectos/{id}/colaboraciones/{colaboracionId}/retiro": {
    parameters: [paramId, paramColaboracionId],
    post: {
      tags: ["Postulaciones"],
      summary: "Retirar una postulacion pendiente",
      description:
        "La persona deshace una postulacion hecha por error. Solo una PENDIENTE " +
        "(409 si no): queda RETIRADA y puede volver a postularse al mismo perfil (a diferencia de rechazo, finalizacion o desvinculacion, que lo impiden).",
      responses: {
        ...recurso("Colaboracion", 200, "Postulacion retirada."),
        404: errores[404],
        409: errores[409],
      },
    },
  },

  "/proyectos/{id}/colaboraciones/{colaboracionId}/desvinculacion": {
    parameters: [paramId, paramColaboracionId],
    post: {
      tags: ["Postulaciones"],
      summary: "Desvincular a una persona de un proyecto",
      description:
        "La usa tanto el colectivo como la persona colaboradora. Solo una ACEPTADA " +
        "(409 si no). Es permanente: la colaboracion queda DESVINCULADA en el historial.",
      responses: {
        ...recurso("Colaboracion", 200, "Colaboracion desvinculada."),
        404: errores[404],
        409: errores[409],
      },
    },
  },

  "/proyectos/{id}/colaboraciones/{colaboracionId}/finalizacion": {
    parameters: [paramId, paramColaboracionId],
    post: {
      tags: ["Postulaciones"],
      summary: "Finalizar una colaboracion",
      description:
        "La persona termina su parte antes de que cierre el proyecto. Solo una ACEPTADA " +
        "(409 si no). Desde ahi las dos partes pueden valorarse.",
      responses: {
        ...recurso("Colaboracion", 200, "Colaboracion finalizada."),
        404: errores[404],
        409: errores[409],
      },
    },
  },

  "/proyectos/{id}/colaboraciones/{colaboracionId}/valoraciones": {
    parameters: [paramId, paramColaboracionId],
    post: {
      tags: ["Postulaciones"],
      summary: "Valorar una colaboracion",
      description:
        "Req. adicional 39. Solo una colaboracion FINALIZADA, y cada parte (`autor`) una " +
        "sola vez (409 si no). Mientras no haya usuarios (tercera entrega), el autor se " +
        "declara en el body.",
      requestBody: body("CrearValoracion"),
      responses: {
        ...recurso("Valoracion", 201, "Valoracion registrada."),
        400: errores[400],
        404: errores[404],
        409: errores[409],
      },
    },
  },

  "/proyectos/{id}/perfiles/{perfilId}/colaboradoras-potenciales": {
    parameters: [paramId, paramPerfilId],
    get: {
      tags: ["Reclutamiento"],
      summary: "Buscar colaboradoras para un perfil",
      description:
        "Minimo de la segunda entrega. Personas con **todas** las habilidades requeridas " +
        "del perfil que todavia no se postularon, ordenadas por cuantas opcionales tienen.",
      parameters: paramsPaginacion,
      responses: {
        200: {
          description: "Pagina de candidatas.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: {
                    type: "array",
                    items: { $ref: "#/components/schemas/ColaboradoraPotencial" },
                  },
                  meta: { $ref: "#/components/schemas/MetaPaginacion" },
                },
              },
            },
          },
        },
        404: errores[404],
        429: errores[429],
      },
    },
  },

  "/proyectos/{id}/perfiles/{perfilId}/invitaciones": {
    parameters: [paramId, paramPerfilId],
    post: {
      tags: ["Reclutamiento"],
      summary: "Invitar a una persona a un perfil",
      description:
        "Le manda una notificacion interna (replicada por sus medios de contacto). La " +
        "persona tiene que cumplir el perfil (422), no haberse postulado ya y aceptar " +
        "mensajeria interna (409), y el proyecto tiene que estar abierto (409).",
      requestBody: body("Invitacion"),
      responses: {
        ...recurso("Notificacion", 201, "Invitacion enviada."),
        400: errores[400],
        422: errores[422],
        404: errores[404],
        409: errores[409],
      },
    },
  },
};
