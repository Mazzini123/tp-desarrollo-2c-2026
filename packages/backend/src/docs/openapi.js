const PROBLEMA = {
  type: "object",
  properties: {
    message: { type: "string" },
    issues: {
      type: "array",
      description: "Solo en errores de validacion: el detalle que devuelve Zod.",
      items: { type: "object" },
    },
  },
};

const META_PAGINACION = {
  type: "object",
  properties: {
    page: { type: "integer", example: 1 },
    per_page: { type: "integer", example: 10 },
    total: { type: "integer", example: 12 },
    total_pages: { type: "integer", example: 2 },
  },
};

const errores = {
  400: {
    description:
      "Falla de forma: falto un campo obligatorio, sobro uno (los schemas son strict), " +
      "un tipo no coincide, o una regla de dominio rechazo el valor.",
    content: { "application/json": { schema: { $ref: "#/components/schemas/Problema" } } },
  },
  404: {
    description: "No existe el recurso referenciado por el id o el codigo de la ruta.",
    content: { "application/json": { schema: { $ref: "#/components/schemas/Problema" } } },
  },
  409: {
    description:
      "Conflicto con el estado actual: la operacion es valida pero el recurso no la admite " +
      "ahora (proyecto ya finalizado, colaborador ya anotado, pronombre repetido, " +
      "codigo de habilidad ya existente).",
    content: { "application/json": { schema: { $ref: "#/components/schemas/Problema" } } },
  },
};

errores[429] = {
  description:
    "Demasiadas solicitudes desde la misma IP (req. adicional 14). La cabecera `RateLimit` " +
    "informa el cupo y cuando se renueva.",
  content: { "application/json": { schema: { $ref: "#/components/schemas/Problema" } } },
};

const paramEtiqueta = {
  name: "etiqueta",
  in: "query",
  description:
    "Filtra por etiqueta (req. adicional 34). Se normaliza igual que al cargarla: " +
    "`Educación Popular` busca `educacion-popular`.",
  schema: { type: "string" },
};

const paramColaboracionId = {
  name: "colaboracionId",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
};

const paramPerfilId = {
  name: "perfilId",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
};

function arrayDe(nombreSchema, descripcion) {
  return {
    200: {
      description: descripcion,
      content: {
        "application/json": {
          schema: { type: "array", items: { $ref: `#/components/schemas/${nombreSchema}` } },
        },
      },
    },
  };
}

const paramsPaginacion = [
  {
    name: "page",
    in: "query",
    description: "Numero de pagina, desde 1.",
    schema: { type: "integer", minimum: 1, default: 1 },
  },
  {
    name: "limit",
    in: "query",
    description: "Elementos por pagina. Tope de 100.",
    schema: { type: "integer", minimum: 1, maximum: 100, default: 10 },
  },
];

const paramId = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
};

function listado(nombreSchema) {
  return {
    200: {
      description: "Pagina de resultados.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: { type: "array", items: { $ref: `#/components/schemas/${nombreSchema}` } },
              meta: { $ref: "#/components/schemas/MetaPaginacion" },
            },
          },
        },
      },
    },
    400: errores[400],
  };
}

function recurso(nombreSchema, codigo = 200, descripcion = "Operacion exitosa.") {
  return {
    [codigo]: {
      description: descripcion,
      content: {
        "application/json": { schema: { $ref: `#/components/schemas/${nombreSchema}` } },
      },
    },
  };
}

function body(nombreSchema) {
  return {
    required: true,
    content: {
      "application/json": { schema: { $ref: `#/components/schemas/${nombreSchema}` } },
    },
  };
}

export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Codigo a Voluntad",
    version: "2.0.0",
    description: [
      "API de la plataforma que conecta colectivos con personas colaboradoras del ambito",
      "del desarrollo de software. TP Integrador de Desarrollo de Software, UTN FRBA, 2C 2026.",
      "",
      "**Forma de las respuestas.** Un recurso se devuelve directo, sin envoltorio. Los listados",
      "devuelven `{ data, meta }`. Los errores devuelven `{ message }`, mas `issues` cuando",
      "son de validacion. El resultado de la operacion lo dice el codigo HTTP, no un campo",
      "del body.",
      "",
      "**Cambio respecto de la primera entrega.** Las respuestas ya no traen el campo",
      "`status`, y `PATCH /proyectos/{id}` fue reemplazado por",
      "`POST /proyectos/{id}/finalizacion`.",
      "",
      "**Persistencia.** MongoDB. Colectivo es el agregado raiz: sus proyectos, perfiles y",
      "colaboraciones van embebidos en el mismo documento; habilidades y colaboradores se",
      "referencian por codigo e id.",
      "",
      "**Segunda entrega.** Se suman perfiles, postulaciones con estado, contribuciones",
      "anonimas, medios de contacto (que nunca se muestran), notificaciones internas",
      "replicadas por email/WhatsApp/SMS, busqueda de colaboradoras, valoraciones,",
      "estadisticas, timeline, etiquetas y redes sociales.",
      "",
      "**Seguridad.** Todo texto que entra se limpia de HTML (req. adicional 11) y hay un",
      "limite de solicitudes por IP (req. adicional 14): 300 cada 15 minutos en general y 30",
      "por minuto en busquedas y estadisticas. Todavia no hay autenticacion (tercera entrega).",
    ].join("\n"),
  },
  servers: [
    { url: "http://localhost:8000", description: "Local" },
    { url: "http://147.15.102.156:8000", description: "Oracle Cloud (San Pablo)" },
  ],
  tags: [
    { name: "Health", description: "Estado del servicio." },
    { name: "Colectivos", description: "Organizaciones que publican proyectos." },
    {
      name: "Proyectos",
      description:
        "Viven dentro de un colectivo: un proyecto sin colectivo no existe, por eso se " +
        "crean desde POST /colectivos/{id}/proyectos y se consultan por su id propio.",
    },
    { name: "Colaboradores", description: "Personas que se anotan a los proyectos." },
    { name: "Habilidades", description: "Catalogo precargado por el administrador." },
    {
      name: "Postulaciones",
      description:
        "Anotarse a un proyecto es postularse. Segun el modo de aceptacion del proyecto, la " +
        "postulacion se resuelve sola o queda pendiente (req. adicional 8). Al terminar, las " +
        "dos partes pueden valorarse (req. adicional 39).",
    },
    {
      name: "Reclutamiento",
      description: "Busqueda de colaboradoras segun un perfil, e invitaciones.",
    },
    {
      name: "Notificaciones",
      description:
        "Mensajes internos de cada persona. Solo se generan si acepta mensajeria interna, y " +
        "se replican por sus medios de contacto.",
    },
    {
      name: "Estadisticas",
      description:
        "Calculadas con el Aggregation Framework de MongoDB (req. adicionales 16, 17 y 30).",
    },
  ],

  paths: {
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
                    uptime: { type: "number", description: "Segundos desde que arranco el proceso." },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },

    "/colectivos": {
      post: {
        tags: ["Colectivos"],
        summary: "Crear colectivo",
        description:
          "`nombre`, `descripcion` y `tipoColectivo` son obligatorios. `ubicacion` es " +
          "opcional pero condicionada: si `tipoUbicacion` es PROVINCIA, `nombre` tiene que " +
          "ser una de las 23 provincias argentinas; si es LOCALIDAD, `nombre` es obligatorio. " +
          "Opcionales: `redesSociales` (req. 27, solo URLs http/https), `etiquetas` (req. 34, " +
          "se normalizan) y `mediosDeContacto` (publicos, a diferencia de los de las personas).",
        requestBody: body("CrearColectivo"),
        responses: { ...recurso("Colectivo", 201, "Colectivo creado."), 400: errores[400] },
      },
      get: {
        tags: ["Colectivos"],
        summary: "Listar colectivos",
        parameters: [...paramsPaginacion, paramEtiqueta],
        responses: listado("Colectivo"),
      },
    },

    "/colectivos/{id}": {
      parameters: [paramId],
      get: {
        tags: ["Colectivos"],
        summary: "Obtener colectivo",
        responses: { ...recurso("Colectivo"), 404: errores[404] },
      },
      put: {
        tags: ["Colectivos"],
        summary: "Actualizar colectivo",
        description:
          "Todos los campos son opcionales. `tipoColectivo` no se puede cambiar despues del " +
          "alta. Las listas (`redesSociales`, `etiquetas`, `mediosDeContacto`) se reemplazan " +
          "completas. Un colectivo dado de baja no se puede modificar (409).",
        requestBody: body("ActualizarColectivo"),
        responses: {
          ...recurso("Colectivo"),
          400: errores[400],
          404: errores[404],
          409: errores[409],
        },
      },
    },

    "/colectivos/{id}/proyectos": {
      parameters: [paramId],
      post: {
        tags: ["Proyectos"],
        summary: "Crear proyecto del colectivo",
        description:
          "Necesita al menos un perfil, y cada perfil al menos una habilidad requerida (los " +
          "codigos tienen que existir y estar activos, o 404). `modoAceptacion` y " +
          "`limiteVacantes` definen como se resuelven las postulaciones (req. 8): TODO_SUMA " +
          "(por defecto) solo sin limite, HASTA_LLENAR_VACANTES solo con limite, " +
          "REVISION_MANUAL con o sin. `fechaCierre` (req. 10) tiene que ser futura. Al crearlo, " +
          "se avisa a las personas compatibles (req. 9). Un colectivo dado de baja no puede " +
          "publicar proyectos (409).",
        requestBody: body("CrearProyecto"),
        responses: {
          ...recurso("Proyecto", 201, "Proyecto creado."),
          400: errores[400],
          404: errores[404],
          409: errores[409],
        },
      },
      get: {
        tags: ["Proyectos"],
        summary: "Listar proyectos del colectivo",
        description: "Sin paginar: devuelve el array completo de proyectos del colectivo.",
        responses: {
          200: {
            description: "Proyectos del colectivo.",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Proyecto" } },
              },
            },
          },
          404: errores[404],
        },
      },
    },

    "/colectivos/{id}/baja": {
      parameters: [paramId],
      post: {
        tags: ["Colectivos"],
        summary: "Dar de baja el colectivo",
        description:
          "Req. adicional 23. Sin body. Borra sus datos de contacto (medios y redes) y cierra " +
          "sus proyectos abiertos con las mismas consecuencias que un cierre manual. La " +
          "historia se conserva: el colectivo se sigue pudiendo consultar, con `fechaBaja`. " +
          "Darlo de baja dos veces responde 409.",
        responses: {
          ...recurso("Colectivo", 200, "Colectivo dado de baja."),
          404: errores[404],
          409: errores[409],
        },
      },
    },

    "/colectivos/{id}/valoraciones": {
      parameters: [paramId],
      get: {
        tags: ["Postulaciones"],
        summary: "Valoraciones que recibio el colectivo",
        description:
          "Req. adicional 39. Lo que opinaron las personas que colaboraron. Si la " +
          "colaboracion fue anonima, `autor` es null.",
        responses: { ...recurso("ResumenValoraciones"), 404: errores[404] },
      },
    },

    "/colectivos/{id}/timeline": {
      parameters: [paramId],
      get: {
        tags: ["Colectivos"],
        summary: "Linea de tiempo del colectivo",
        description:
          "Req. adicional 19. Historial publico, de lo mas viejo a lo mas nuevo: alta y baja " +
          "del colectivo, proyectos creados y finalizados, logros y colaboraciones cerradas.",
        responses: { ...arrayDe("EventoTimeline", "Eventos en orden cronologico."), 404: errores[404] },
      },
    },

    "/colectivos/{id}/estadisticas": {
      parameters: [paramId],
      get: {
        tags: ["Estadisticas"],
        summary: "Panel de estadisticas del colectivo",
        description:
          "Req. adicional 17: proyectos, colaboraciones por estado, visualizaciones, avance " +
          "promedio (porcentaje de concrecion) y logros, en total y por proyecto.",
        responses: {
          ...recurso("EstadisticasColectivo"),
          404: errores[404],
          429: errores[429],
        },
      },
    },

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

    "/proyectos": {
      get: {
        tags: ["Proyectos"],
        summary: "Listar proyectos",
        description: "Todos los proyectos de todos los colectivos.",
        parameters: [...paramsPaginacion, paramEtiqueta],
        responses: listado("Proyecto"),
      },
    },

    "/proyectos/{id}": {
      parameters: [paramId],
      get: {
        tags: ["Proyectos"],
        summary: "Obtener proyecto",
        description: "Cada consulta suma una visualizacion (req. adicional 17).",
        responses: { ...recurso("Proyecto"), 404: errores[404] },
      },
      put: {
        tags: ["Proyectos"],
        summary: "Actualizar proyecto",
        description:
          "Todos los campos son opcionales. Cambiar `modoAceptacion` o `limiteVacantes` " +
          "resuelve las postulaciones pendientes con las reglas nuevas; el limite no puede " +
          "quedar por debajo de las ya aceptadas (400). `fechaCierre: null` saca la fecha " +
          "de cierre. Un proyecto finalizado no se puede modificar: responde 409.",
        requestBody: body("ActualizarProyecto"),
        responses: {
          ...recurso("Proyecto"),
          400: errores[400],
          404: errores[404],
          409: errores[409],
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
          "Validaciones, en este orden: el proyecto tiene que estar abierto y con vacantes " +
          "(409 si no; si la fecha de cierre ya paso, se cierra en el momento), la persona " +
          "tiene que tener **todas** las habilidades requeridas de al menos un perfil (400 si " +
          "no), y no puede haberse postulado antes (409). La colaboracion queda PENDIENTE o se " +
          "resuelve en el momento segun el `modoAceptacion` del proyecto. Con " +
          "`esPublica: false` la contribucion es anonima: figura, pero con `colaborador: null`.",
        requestBody: body("AnotarColaborador"),
        responses: {
          ...recurso("Colaboracion", 201, "Colaboracion registrada."),
          400: errores[400],
          404: errores[404],
          409: errores[409],
        },
      },
      get: {
        tags: ["Proyectos"],
        summary: "Listar colaboraciones del proyecto",
        description: "Todas, en cualquier estado. Las anonimas vienen con `colaborador: null`.",
        responses: {
          200: {
            description: "Colaboraciones registradas.",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Colaboracion" } },
              },
            },
          },
          404: errores[404],
        },
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
          "persona tiene que cumplir el perfil (400), no haberse postulado ya y aceptar " +
          "mensajeria interna (409), y el proyecto tiene que estar abierto (409).",
        requestBody: body("Invitacion"),
        responses: {
          ...recurso("Notificacion", 201, "Invitacion enviada."),
          400: errores[400],
          404: errores[404],
          409: errores[409],
        },
      },
    },

    "/colaboradores": {
      post: {
        tags: ["Colaboradores"],
        summary: "Crear colaborador",
        description:
          "Todos los campos de identificacion son opcionales por separado, pero hace falta " +
          "**al menos uno de estos tres**: `nombreFantasia`, `cuentaGit`, o `nombre` y " +
          "`apellido` juntos. Si no, la respuesta es 400. Los `pronombres` repetidos del " +
          "payload se descartan en silencio. `mediosDeContacto` se registran pero **nunca " +
          "se muestran** en ninguna respuesta. `recibeMensajeriaInterna` (default true) " +
          "decide si se le pueden mandar notificaciones. Al crearla, se le avisa que " +
          "proyectos abiertos le sirven (req. 9).",
        requestBody: body("CrearColaborador"),
        responses: {
          ...recurso("Colaborador", 201, "Colaborador creado."),
          400: errores[400],
          404: errores[404],
        },
      },
      get: {
        tags: ["Colaboradores"],
        summary: "Listar colaboradores",
        parameters: paramsPaginacion,
        responses: listado("Colaborador"),
      },
    },

    "/colaboradores/{id}": {
      parameters: [paramId],
      get: {
        tags: ["Colaboradores"],
        summary: "Obtener colaborador",
        responses: { ...recurso("Colaborador"), 404: errores[404] },
      },
      put: {
        tags: ["Colaboradores"],
        summary: "Actualizar colaborador",
        description:
          "`pronombres` **reemplaza** la lista completa y deduplica en silencio; para agregar " +
          "de a uno esta POST /colaboradores/{id}/pronombres. `redesSociales` tambien se " +
          "reemplaza completa. Los medios de contacto se manejan por su propia ruta.",
        requestBody: body("ActualizarColaborador"),
        responses: { ...recurso("Colaborador"), 400: errores[400], 404: errores[404] },
      },
    },

    "/colaboradores/{id}/pronombres": {
      parameters: [paramId],
      post: {
        tags: ["Colaboradores"],
        summary: "Agregar un pronombre",
        description:
          "A diferencia del PUT, aca el duplicado **si** es un error y responde 409: la " +
          "intencion de la operacion es agregar uno nuevo, no dejar una lista.",
        requestBody: body("AgregarPronombre"),
        responses: {
          ...recurso("Colaborador"),
          400: errores[400],
          404: errores[404],
          409: errores[409],
        },
      },
    },

    "/colaboradores/{id}/pronombres/{pronombre}": {
      parameters: [
        paramId,
        { name: "pronombre", in: "path", required: true, schema: { type: "string" } },
      ],
      delete: {
        tags: ["Colaboradores"],
        summary: "Quitar un pronombre",
        description: "Idempotente: quitar uno que no esta no es error.",
        responses: { ...recurso("Colaborador"), 404: errores[404] },
      },
    },

    "/colaboradores/{id}/habilidades": {
      parameters: [paramId],
      post: {
        tags: ["Colaboradores"],
        summary: "Agregar habilidad al colaborador",
        description:
          "Idempotente. El codigo tiene que existir en el catalogo y estar activo, o la " +
          "respuesta es 404.",
        requestBody: body("AgregarHabilidad"),
        responses: { ...recurso("Colaborador"), 400: errores[400], 404: errores[404] },
      },
    },

    "/colaboradores/{id}/habilidades/{codigoHabilidad}": {
      parameters: [
        paramId,
        { name: "codigoHabilidad", in: "path", required: true, schema: { type: "string" } },
      ],
      delete: {
        tags: ["Colaboradores"],
        summary: "Quitar habilidad del colaborador",
        description:
          "Sin minimo, a diferencia de los proyectos: un colaborador puede quedarse sin " +
          "ninguna habilidad. Lo que no va a poder es anotarse a proyectos.",
        responses: { ...recurso("Colaborador"), 404: errores[404] },
      },
    },

    "/colaboradores/{id}/colaboraciones": {
      parameters: [paramId],
      get: {
        tags: ["Colaboradores"],
        summary: "Listar colaboraciones del colaborador",
        description:
          "Cada item trae el `proyectoId` ademas de la colaboracion, porque la colaboracion " +
          "vive dentro del proyecto y por si sola no dice a cual pertenece.",
        responses: {
          200: {
            description: "Colaboraciones del colaborador, con el proyecto al que pertenecen.",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      proyectoId: { type: "string", format: "uuid" },
                      colaboracion: { $ref: "#/components/schemas/Colaboracion" },
                    },
                  },
                },
              },
            },
          },
          404: errores[404],
        },
      },
    },

    "/colaboradores/{id}/proyectos-potenciales": {
      parameters: [paramId],
      get: {
        tags: ["Reclutamiento"],
        summary: "Buscar proyectos para un colaborador",
        description:
          "Minimo de la segunda entrega (req. 3.d). Proyectos abiertos y con vacantes donde " +
          "la persona cumple las habilidades requeridas de al menos un perfil, y todavia no " +
          "se postulo.",
        parameters: paramsPaginacion,
        responses: {
          ...listado("Proyecto"),
          404: errores[404],
          429: errores[429],
        },
      },
    },

    "/colaboradores/{id}/medios-de-contacto": {
      parameters: [paramId],
      post: {
        tags: ["Colaboradores"],
        summary: "Registrar un medio de contacto",
        description:
          "EMAIL con formato de email; WHATSAPP y SMS con telefono (se guarda solo con " +
          "digitos y el + inicial). Responde solo el medio registrado: los medios no se " +
          "muestran en el colaborador. Uno repetido responde 409.",
        requestBody: body("MedioDeContacto"),
        responses: {
          ...recurso("MedioDeContacto", 201, "Medio registrado."),
          400: errores[400],
          404: errores[404],
          409: errores[409],
        },
      },
    },

    "/colaboradores/{id}/medios-de-contacto/{tipo}/{valor}": {
      parameters: [
        paramId,
        {
          name: "tipo",
          in: "path",
          required: true,
          schema: { type: "string", enum: ["EMAIL", "WHATSAPP", "SMS"] },
        },
        {
          name: "valor",
          in: "path",
          required: true,
          description: "Se normaliza igual que en el alta (mayusculas, espacios, guiones).",
          schema: { type: "string" },
        },
      ],
      delete: {
        tags: ["Colaboradores"],
        summary: "Quitar un medio de contacto",
        responses: { 204: { description: "Medio quitado." }, 400: errores[400], 404: errores[404] },
      },
    },

    "/colaboradores/{id}/valoraciones": {
      parameters: [paramId],
      get: {
        tags: ["Postulaciones"],
        summary: "Valoraciones que recibio la persona",
        description:
          "Req. adicional 39. Lo que opinaron los colectivos. Las colaboraciones anonimas no " +
          "aparecen: mostrarlas diria quien las hizo.",
        responses: { ...recurso("ResumenValoraciones"), 404: errores[404] },
      },
    },

    "/colaboradores/{id}/notificaciones": {
      parameters: [paramId],
      get: {
        tags: ["Notificaciones"],
        summary: "Bandeja de mensajes de la persona",
        description: "De la mas nueva a la mas vieja.",
        parameters: paramsPaginacion,
        responses: { ...listado("Notificacion"), 404: errores[404] },
      },
    },

    "/colaboradores/{id}/notificaciones/{notificacionId}/lectura": {
      parameters: [
        paramId,
        { name: "notificacionId", in: "path", required: true, schema: { type: "string" } },
      ],
      post: {
        tags: ["Notificaciones"],
        summary: "Marcar una notificacion como leida",
        description: "Una notificacion de otra persona responde 404, igual que una inexistente.",
        responses: { ...recurso("Notificacion"), 404: errores[404] },
      },
    },

    "/habilidades": {
      post: {
        tags: ["Habilidades"],
        summary: "Crear habilidad",
        description:
          "Solo el administrador carga el catalogo. El `codigo` no se manda: se deriva del " +
          "`titulo` normalizado a snake_case sin acentos, asi que \"Diseno UX UI\" y " +
          "\"diseño ux ui\" colisionan y la segunda responde 409.",
        requestBody: body("CrearHabilidad"),
        responses: {
          ...recurso("Habilidad", 201, "Habilidad creada."),
          400: errores[400],
          409: errores[409],
        },
      },
      get: {
        tags: ["Habilidades"],
        summary: "Listar habilidades",
        parameters: paramsPaginacion,
        responses: listado("Habilidad"),
      },
    },
  },

  components: {
    schemas: {
      Problema: PROBLEMA,
      MetaPaginacion: META_PAGINACION,

      Ubicacion: {
        type: "object",
        required: ["tipoUbicacion"],
        properties: {
          tipoUbicacion: {
            type: "string",
            enum: ["ARGENTINA", "PROVINCIA", "CABA", "LOCALIDAD"],
            description:
              "`nombre` solo se conserva para PROVINCIA y LOCALIDAD; en ARGENTINA y CABA " +
              "se ignora y queda null.",
          },
          nombre: { type: "string", example: "Santa Fe" },
        },
      },

      Compromiso: {
        type: "object",
        required: ["cantidadHoras", "periodo"],
        properties: {
          cantidadHoras: { type: "integer", minimum: 1, example: 5 },
          periodo: {
            type: "string",
            enum: ["HS_TOTALES", "HS_SEMANALES", "HS_MENSUALES"],
          },
        },
      },

      Habilidad: {
        type: "object",
        properties: {
          titulo: { type: "string", example: "Desarrollo Node" },
          codigo: { type: "string", example: "desarrollo_node" },
          descripcion: { type: "string" },
          fechaCreacion: { type: "string", format: "date-time" },
          usuario: { type: "string", example: "seed" },
          activo: { type: "boolean" },
        },
      },

      RedSocial: {
        type: "object",
        required: ["nombre", "url"],
        additionalProperties: false,
        properties: {
          nombre: { type: "string", maxLength: 40, example: "Instagram" },
          url: {
            type: "string",
            format: "uri",
            description: "Solo http o https.",
            example: "https://instagram.com/huerta",
          },
        },
      },

      MedioDeContacto: {
        type: "object",
        required: ["tipo", "valor"],
        additionalProperties: false,
        properties: {
          tipo: { type: "string", enum: ["EMAIL", "WHATSAPP", "SMS"] },
          valor: { type: "string", example: "ada@mail.com" },
        },
      },

      Colectivo: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          nombre: { type: "string" },
          descripcion: { type: "string", description: "Admite Markdown (req. 38)." },
          tipoColectivo: {
            type: "string",
            enum: ["FUNDACION", "ASOCIACION_BARRIAL", "ONG", "ASAMBLEA"],
          },
          ubicacion: { oneOf: [{ $ref: "#/components/schemas/Ubicacion" }, { type: "null" }] },
          proyectos: { type: "array", items: { $ref: "#/components/schemas/Proyecto" } },
          redesSociales: { type: "array", items: { $ref: "#/components/schemas/RedSocial" } },
          etiquetas: { type: "array", items: { type: "string" }, example: ["ambiente"] },
          mediosDeContacto: {
            type: "array",
            items: { $ref: "#/components/schemas/MedioDeContacto" },
          },
          fechaAlta: { type: "string", format: "date-time" },
          fechaBaja: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "Distinta de null si el colectivo se dio de baja (req. 23).",
          },
        },
      },

      Perfil: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          descripcion: { type: "string" },
          compromiso: { $ref: "#/components/schemas/Compromiso" },
          modalidadColaboracion: {
            type: "string",
            enum: ["GRATUITA", "OFRECE_INCENTIVO_ECONOMICO", "EXISTE_POSIBILIDAD_DE_CONTRATACION"],
          },
          habilidadesRequeridas: {
            type: "array",
            items: { $ref: "#/components/schemas/Habilidad" },
          },
          habilidadesOpcionales: {
            type: "array",
            items: { $ref: "#/components/schemas/Habilidad" },
          },
        },
      },

      Proyecto: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          titulo: { type: "string" },
          descripcion: { type: "string", description: "Admite Markdown (req. 38)." },
          estado: { type: "string", enum: ["ABIERTO", "FINALIZADO"] },
          perfiles: { type: "array", items: { $ref: "#/components/schemas/Perfil" } },
          colaboraciones: {
            type: "array",
            items: { $ref: "#/components/schemas/Colaboracion" },
          },
          logros: { type: "array", items: { type: "object" } },
          porcentajeConcrecion: { type: "number" },
          urlSistema: { type: "string", nullable: true },
          urlRepositorio: { type: "string", nullable: true },
          etiquetas: { type: "array", items: { type: "string" } },
          modoAceptacion: {
            type: "string",
            enum: ["TODO_SUMA", "HASTA_LLENAR_VACANTES", "REVISION_MANUAL"],
          },
          limiteVacantes: { type: "integer", nullable: true },
          fechaCreacion: { type: "string", format: "date-time", nullable: true },
          fechaFinalizacion: { type: "string", format: "date-time", nullable: true },
          fechaCierre: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "Al llegar esta fecha se cierra solo (req. 10).",
          },
          visualizaciones: { type: "integer" },
        },
      },

      Colaborador: {
        type: "object",
        description: "Los medios de contacto nunca forman parte de la respuesta.",
        properties: {
          id: { type: "string", format: "uuid" },
          nombreFantasia: { type: "string", nullable: true },
          nombre: { type: "string", nullable: true },
          apellido: { type: "string", nullable: true },
          cuentaGit: { type: "string", nullable: true },
          pronombres: {
            type: "array",
            items: { type: "string" },
            description: "Lista sin repetidos. Era un Set hasta la correccion C1.",
          },
          presentacion: { type: "string", nullable: true },
          habilidades: { type: "array", items: { $ref: "#/components/schemas/Habilidad" } },
          recibeMensajeriaInterna: { type: "boolean" },
          redesSociales: { type: "array", items: { $ref: "#/components/schemas/RedSocial" } },
        },
      },

      Valoracion: {
        type: "object",
        properties: {
          puntaje: { type: "integer", minimum: 1, maximum: 5 },
          comentario: { type: "string", nullable: true },
          fecha: { type: "string", format: "date-time" },
        },
      },

      Colaboracion: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          colaborador: {
            nullable: true,
            allOf: [{ $ref: "#/components/schemas/Colaborador" }],
            description: "null si la contribucion es anonima.",
          },
          esPublica: { type: "boolean" },
          fecha: { type: "string", format: "date-time", description: "Cuando se postulo." },
          estado: {
            type: "string",
            enum: ["PENDIENTE", "ACEPTADA", "RECHAZADA", "FINALIZADA"],
          },
          fechaResolucion: { type: "string", format: "date-time", nullable: true },
          fechaFin: { type: "string", format: "date-time", nullable: true },
          valoracionDelColectivo: {
            nullable: true,
            allOf: [{ $ref: "#/components/schemas/Valoracion" }],
          },
          valoracionDelColaborador: {
            nullable: true,
            allOf: [{ $ref: "#/components/schemas/Valoracion" }],
          },
        },
      },

      Notificacion: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          destinatarioId: { type: "string", format: "uuid" },
          tipo: {
            type: "string",
            enum: [
              "INVITACION",
              "PROYECTOS_COMPATIBLES",
              "POSTULACION_ACEPTADA",
              "POSTULACION_RECHAZADA",
              "COLABORACION_FINALIZADA",
            ],
          },
          asunto: { type: "string" },
          contenido: { type: "string" },
          referencias: {
            type: "object",
            description: "Ids relacionados (proyectoId, perfilId...) para armar links.",
          },
          fecha: { type: "string", format: "date-time" },
          esLeida: { type: "boolean" },
          envios: {
            type: "array",
            description: "Resultado de replicarla por cada medio de contacto.",
            items: {
              type: "object",
              properties: {
                canal: { type: "string", enum: ["EMAIL", "WHATSAPP", "SMS"] },
                exito: { type: "boolean" },
              },
            },
          },
        },
      },

      ColaboradoraPotencial: {
        type: "object",
        properties: {
          colaborador: { $ref: "#/components/schemas/Colaborador" },
          habilidadesOpcionalesQueTiene: {
            type: "array",
            items: { type: "string" },
            example: ["desarrollo_web_react"],
          },
        },
      },

      ResumenValoraciones: {
        type: "object",
        properties: {
          cantidad: { type: "integer" },
          promedio: { type: "number", nullable: true, example: 4.5 },
          valoraciones: {
            type: "array",
            items: {
              type: "object",
              properties: {
                proyecto: {
                  type: "object",
                  properties: { id: { type: "string" }, titulo: { type: "string" } },
                },
                colectivo: {
                  type: "object",
                  description: "Solo en las valoraciones de una persona.",
                },
                autor: {
                  type: "object",
                  nullable: true,
                  description: "Solo en las de un colectivo; null si fue anonima.",
                },
                puntaje: { type: "integer" },
                comentario: { type: "string", nullable: true },
                fecha: { type: "string", format: "date-time" },
              },
            },
          },
        },
      },

      EventoTimeline: {
        type: "object",
        properties: {
          tipo: {
            type: "string",
            enum: [
              "ALTA_DEL_COLECTIVO",
              "PROYECTO_CREADO",
              "LOGRO",
              "COLABORACION_CERRADA",
              "PROYECTO_FINALIZADO",
              "BAJA_DEL_COLECTIVO",
            ],
          },
          fecha: { type: "string", format: "date-time" },
          proyecto: {
            type: "object",
            properties: { id: { type: "string" }, titulo: { type: "string" } },
          },
          logro: { type: "object" },
          colaborador: {
            type: "object",
            nullable: true,
            properties: { id: { type: "string" }, nombre: { type: "string" } },
          },
        },
      },

      EstadisticasGlobales: {
        type: "object",
        properties: {
          colectivos: {
            type: "object",
            properties: {
              total: { type: "integer" },
              activos: { type: "integer" },
              dadosDeBaja: { type: "integer" },
            },
          },
          proyectos: {
            type: "object",
            properties: {
              total: { type: "integer" },
              abiertos: { type: "integer" },
              finalizados: { type: "integer" },
            },
          },
          colaboradores: { type: "object", properties: { total: { type: "integer" } } },
          colaboraciones: {
            type: "object",
            properties: {
              total: { type: "integer" },
              pendientes: { type: "integer" },
              aceptadas: { type: "integer" },
              rechazadas: { type: "integer" },
              finalizadas: { type: "integer" },
              anonimas: { type: "integer" },
            },
          },
          habilidadesMasRequeridas: {
            type: "array",
            items: {
              type: "object",
              properties: { codigo: { type: "string" }, cantidad: { type: "integer" } },
            },
          },
          habilidadesMasOfrecidas: {
            type: "array",
            items: {
              type: "object",
              properties: { codigo: { type: "string" }, cantidad: { type: "integer" } },
            },
          },
          generadoEn: { type: "string", format: "date-time" },
        },
      },

      EstadisticasColectivo: {
        type: "object",
        properties: {
          colectivo: {
            type: "object",
            properties: { id: { type: "string" }, nombre: { type: "string" } },
          },
          proyectos: {
            type: "object",
            properties: {
              total: { type: "integer" },
              abiertos: { type: "integer" },
              finalizados: { type: "integer" },
            },
          },
          colaboraciones: { type: "object" },
          visualizaciones: { type: "integer" },
          avancePromedio: { type: "number", description: "Porcentaje de concrecion promedio." },
          logros: { type: "integer" },
          porProyecto: { type: "array", items: { type: "object" } },
          generadoEn: { type: "string", format: "date-time" },
        },
      },

      CrearColectivo: {
        type: "object",
        required: ["nombre", "descripcion", "tipoColectivo"],
        additionalProperties: false,
        properties: {
          nombre: { type: "string", minLength: 1 },
          descripcion: { type: "string", minLength: 1 },
          tipoColectivo: {
            type: "string",
            enum: ["FUNDACION", "ASOCIACION_BARRIAL", "ONG", "ASAMBLEA"],
          },
          ubicacion: { oneOf: [{ $ref: "#/components/schemas/Ubicacion" }, { type: "null" }] },
          redesSociales: {
            type: "array",
            maxItems: 10,
            items: { $ref: "#/components/schemas/RedSocial" },
          },
          etiquetas: { type: "array", maxItems: 10, items: { type: "string", maxLength: 30 } },
          mediosDeContacto: {
            type: "array",
            maxItems: 10,
            items: { $ref: "#/components/schemas/MedioDeContacto" },
          },
        },
      },

      ActualizarColectivo: {
        type: "object",
        additionalProperties: false,
        properties: {
          nombre: { type: "string", minLength: 1 },
          descripcion: { type: "string", minLength: 1 },
          ubicacion: { oneOf: [{ $ref: "#/components/schemas/Ubicacion" }, { type: "null" }] },
          redesSociales: { type: "array", items: { $ref: "#/components/schemas/RedSocial" } },
          etiquetas: { type: "array", items: { type: "string" } },
          mediosDeContacto: {
            type: "array",
            items: { $ref: "#/components/schemas/MedioDeContacto" },
          },
        },
      },

      CrearPerfil: {
        type: "object",
        required: ["descripcion", "codigosHabilidadesRequeridas", "compromiso"],
        additionalProperties: false,
        properties: {
          descripcion: { type: "string", minLength: 1 },
          codigosHabilidadesRequeridas: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
            example: ["desarrollo_node"],
          },
          codigosHabilidadesOpcionales: { type: "array", items: { type: "string" } },
          compromiso: { $ref: "#/components/schemas/Compromiso" },
          modalidadColaboracion: {
            type: "string",
            enum: ["GRATUITA", "OFRECE_INCENTIVO_ECONOMICO", "EXISTE_POSIBILIDAD_DE_CONTRATACION"],
            default: "GRATUITA",
          },
        },
      },

      CrearProyecto: {
        type: "object",
        required: ["titulo", "descripcion", "perfiles"],
        additionalProperties: false,
        properties: {
          titulo: { type: "string", minLength: 1 },
          descripcion: { type: "string", minLength: 1 },
          perfiles: {
            type: "array",
            minItems: 1,
            items: { $ref: "#/components/schemas/CrearPerfil" },
          },
          etiquetas: { type: "array", maxItems: 10, items: { type: "string", maxLength: 30 } },
          modoAceptacion: {
            type: "string",
            enum: ["TODO_SUMA", "HASTA_LLENAR_VACANTES", "REVISION_MANUAL"],
            default: "TODO_SUMA",
          },
          limiteVacantes: { type: "integer", minimum: 1, nullable: true },
          fechaCierre: {
            type: "string",
            format: "date-time",
            nullable: true,
            example: "2026-12-01T18:00:00-03:00",
          },
        },
      },

      ActualizarProyecto: {
        type: "object",
        additionalProperties: false,
        properties: {
          titulo: { type: "string", minLength: 1 },
          descripcion: { type: "string", minLength: 1 },
          etiquetas: { type: "array", items: { type: "string" } },
          modoAceptacion: {
            type: "string",
            enum: ["TODO_SUMA", "HASTA_LLENAR_VACANTES", "REVISION_MANUAL"],
          },
          limiteVacantes: { type: "integer", minimum: 1, nullable: true },
          fechaCierre: { type: "string", format: "date-time", nullable: true },
        },
      },

      CrearColaborador: {
        type: "object",
        additionalProperties: false,
        properties: {
          nombreFantasia: { type: "string", minLength: 1, nullable: true },
          nombre: { type: "string", minLength: 1, nullable: true },
          apellido: { type: "string", minLength: 1, nullable: true },
          cuentaGit: { type: "string", minLength: 1, nullable: true },
          pronombres: { type: "array", items: { type: "string", minLength: 1 } },
          presentacion: { type: "string", nullable: true },
          codigosHabilidades: { type: "array", items: { type: "string", minLength: 1 } },
          recibeMensajeriaInterna: { type: "boolean", default: true },
          mediosDeContacto: {
            type: "array",
            maxItems: 10,
            items: { $ref: "#/components/schemas/MedioDeContacto" },
          },
          redesSociales: {
            type: "array",
            maxItems: 10,
            items: { $ref: "#/components/schemas/RedSocial" },
          },
        },
      },

      ActualizarColaborador: {
        type: "object",
        additionalProperties: false,
        properties: {
          pronombres: { type: "array", items: { type: "string", minLength: 1 } },
          presentacion: { type: "string", nullable: true },
          recibeMensajeriaInterna: { type: "boolean" },
          redesSociales: { type: "array", items: { $ref: "#/components/schemas/RedSocial" } },
        },
      },

      AgregarPronombre: {
        type: "object",
        required: ["pronombre"],
        additionalProperties: false,
        properties: { pronombre: { type: "string", minLength: 1, example: "elle" } },
      },

      AgregarHabilidad: {
        type: "object",
        required: ["codigoHabilidad"],
        additionalProperties: false,
        properties: {
          codigoHabilidad: { type: "string", minLength: 1, example: "desarrollo_node" },
        },
      },

      AnotarColaborador: {
        type: "object",
        required: ["colaboradorId"],
        additionalProperties: false,
        properties: {
          colaboradorId: { type: "string", minLength: 1 },
          esPublica: {
            type: "boolean",
            default: true,
            description: "false = contribucion anonima.",
          },
        },
      },

      Invitacion: {
        type: "object",
        required: ["colaboradorId"],
        additionalProperties: false,
        properties: {
          colaboradorId: { type: "string", minLength: 1 },
          mensaje: { type: "string", maxLength: 500 },
        },
      },

      CrearValoracion: {
        type: "object",
        required: ["autor", "puntaje"],
        additionalProperties: false,
        properties: {
          autor: { type: "string", enum: ["COLECTIVO", "COLABORADOR"] },
          puntaje: { type: "integer", minimum: 1, maximum: 5 },
          comentario: { type: "string", maxLength: 280 },
        },
      },

      CrearHabilidad: {
        type: "object",
        required: ["titulo"],
        additionalProperties: false,
        properties: {
          titulo: { type: "string", minLength: 1 },
          descripcion: { type: "string", default: "" },
          usuario: { type: "string", minLength: 1 },
        },
      },
    },
  },
};
