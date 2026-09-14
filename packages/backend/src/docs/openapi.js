/**
 * Especificacion OpenAPI 3.0 de la API. Se sirve con swagger-ui-express en
 * GET /docs y como JSON en GET /openapi.json.
 *
 * Correcciones E2 y E3 del coloquio. E3 es la que manda sobre el contenido:
 * "si respetan la semantica de REST, lo mas probable es que no haga falta que
 * aclaren que es lo que hace. Si dicen POST colectivos, es crear colectivo".
 *
 * Por eso el `summary` de cada operacion es telegrafico y el esfuerzo esta
 * puesto en lo que NO se deduce de la ruta: que valida, que reglas de negocio
 * aplica, y por que tira 409 en vez de 400.
 */

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

/** Respuestas de error reutilizables, con el porque de cada codigo. */
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
      "**Persistencia.** En memoria: se reinicia con el proceso.",
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
          "ser una de las 23 provincias argentinas; si es LOCALIDAD, `nombre` es obligatorio.",
        requestBody: body("CrearColectivo"),
        responses: { ...recurso("Colectivo", 201, "Colectivo creado."), 400: errores[400] },
      },
      get: {
        tags: ["Colectivos"],
        summary: "Listar colectivos",
        parameters: paramsPaginacion,
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
          "Todos los campos son opcionales, pero solo se aceptan `nombre`, `descripcion` y " +
          "`ubicacion`. `tipoColectivo` no se puede cambiar despues del alta.",
        requestBody: body("ActualizarColectivo"),
        responses: { ...recurso("Colectivo"), 400: errores[400], 404: errores[404] },
      },
    },

    "/colectivos/{id}/proyectos": {
      parameters: [paramId],
      post: {
        tags: ["Proyectos"],
        summary: "Crear proyecto del colectivo",
        description:
          "`habilidadesNecesarias` es una lista de codigos del catalogo y necesita al menos " +
          "uno: un proyecto sin ninguna habilidad requerida no se puede crear. Cada codigo " +
          "tiene que existir y estar activo, o la respuesta es 404.",
        requestBody: body("CrearProyecto"),
        responses: { ...recurso("Proyecto", 201, "Proyecto creado."), 400: errores[400], 404: errores[404] },
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

    "/proyectos": {
      get: {
        tags: ["Proyectos"],
        summary: "Listar proyectos",
        description: "Todos los proyectos de todos los colectivos.",
        parameters: paramsPaginacion,
        responses: listado("Proyecto"),
      },
    },

    "/proyectos/{id}": {
      parameters: [paramId],
      get: {
        tags: ["Proyectos"],
        summary: "Obtener proyecto",
        responses: { ...recurso("Proyecto"), 404: errores[404] },
      },
      put: {
        tags: ["Proyectos"],
        summary: "Actualizar proyecto",
        description:
          "Solo `titulo` y `descripcion`. Un proyecto finalizado no se puede modificar: " +
          "responde 409.",
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
          "cascada: un proyecto finalizado no admite nuevas colaboraciones, ni cambios de " +
          "titulo o descripcion, ni altas o bajas de habilidades. Finalizar uno ya " +
          "finalizado responde 409.",
        responses: {
          ...recurso("Proyecto", 200, "Proyecto finalizado."),
          404: errores[404],
          409: errores[409],
        },
      },
    },

    "/proyectos/{id}/habilidades": {
      parameters: [paramId],
      post: {
        tags: ["Proyectos"],
        summary: "Agregar habilidad requerida",
        description:
          "Idempotente: si el proyecto ya requiere esa habilidad, no cambia nada y responde " +
          "200. El codigo tiene que existir en el catalogo y estar activo.",
        requestBody: body("AgregarHabilidad"),
        responses: {
          ...recurso("Proyecto"),
          400: errores[400],
          404: errores[404],
          409: errores[409],
        },
      },
    },

    "/proyectos/{id}/habilidades/{codigoHabilidad}": {
      parameters: [
        paramId,
        {
          name: "codigoHabilidad",
          in: "path",
          required: true,
          description: "Codigo snake_case de la habilidad, por ejemplo `desarrollo_node`.",
          schema: { type: "string" },
        },
      ],
      delete: {
        tags: ["Proyectos"],
        summary: "Quitar habilidad requerida",
        description:
          "No se puede quitar la ultima: un proyecto tiene que conservar al menos una " +
          "habilidad necesaria, o la respuesta es 400. Tampoco se puede tocar un proyecto " +
          "finalizado (409).",
        responses: {
          ...recurso("Proyecto"),
          400: errores[400],
          404: errores[404],
          409: errores[409],
        },
      },
    },

    "/proyectos/{id}/colaboraciones": {
      parameters: [paramId],
      post: {
        tags: ["Proyectos"],
        summary: "Anotar colaborador al proyecto",
        description:
          "Tres validaciones de negocio, en este orden: el proyecto tiene que estar abierto " +
          "(409 si no), el colaborador tiene que tener **al menos una** de las habilidades " +
          "que el proyecto requiere (400 si no), y no puede estar ya anotado (409).",
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

    "/colaboradores": {
      post: {
        tags: ["Colaboradores"],
        summary: "Crear colaborador",
        description:
          "Todos los campos de identificacion son opcionales por separado, pero hace falta " +
          "**al menos uno de estos tres**: `nombreFantasia`, `cuentaGit`, o `nombre` y " +
          "`apellido` juntos. Si no, la respuesta es 400. Los `pronombres` repetidos del " +
          "payload se descartan en silencio.",
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
          "Solo `pronombres` y `presentacion`. `pronombres` **reemplaza** la lista completa " +
          "y deduplica en silencio; para agregar de a uno esta " +
          "POST /colaboradores/{id}/pronombres.",
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

      Colectivo: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          nombre: { type: "string" },
          descripcion: { type: "string" },
          tipoColectivo: {
            type: "string",
            enum: ["FUNDACION", "ASOCIACION_BARRIAL", "ONG", "ASAMBLEA"],
          },
          ubicacion: { oneOf: [{ $ref: "#/components/schemas/Ubicacion" }, { type: "null" }] },
          proyectos: { type: "array", items: { $ref: "#/components/schemas/Proyecto" } },
        },
      },

      Proyecto: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          titulo: { type: "string" },
          descripcion: { type: "string" },
          compromisoEsperado: { $ref: "#/components/schemas/Compromiso" },
          modalidadColaboracion: {
            type: "string",
            enum: [
              "GRATUITA",
              "OFRECE_INCENTIVO_ECONOMICO",
              "EXISTE_POSIBILIDAD_DE_CONTRATACION",
            ],
          },
          estado: { type: "string", enum: ["ABIERTO", "FINALIZADO"] },
          habilidadesNecesarias: {
            type: "array",
            minItems: 1,
            items: { $ref: "#/components/schemas/Habilidad" },
          },
          colaboraciones: {
            type: "array",
            items: { $ref: "#/components/schemas/Colaboracion" },
          },
        },
      },

      Colaborador: {
        type: "object",
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
        },
      },

      Colaboracion: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          colaborador: { $ref: "#/components/schemas/Colaborador" },
          fecha: { type: "string", format: "date-time" },
        },
      },

      CrearColectivo: {
        type: "object",
        required: ["nombre", "descripcion", "tipoColectivo"],
        additionalProperties: false,
        properties: {
          nombre: { type: "string", minLength: 1 },
          descripcion: { type: "string", minLength: 1 },
          tipoColectivo: { type: "string", enum: ["FUNDACION", "ASOCIACION_BARRIAL", "ONG", "ASAMBLEA"] },
          ubicacion: { oneOf: [{ $ref: "#/components/schemas/Ubicacion" }, { type: "null" }] },
        },
      },

      ActualizarColectivo: {
        type: "object",
        additionalProperties: false,
        properties: {
          nombre: { type: "string", minLength: 1 },
          descripcion: { type: "string", minLength: 1 },
          ubicacion: { oneOf: [{ $ref: "#/components/schemas/Ubicacion" }, { type: "null" }] },
        },
      },

      CrearProyecto: {
        type: "object",
        required: ["titulo", "descripcion", "compromisoEsperado", "habilidadesNecesarias"],
        additionalProperties: false,
        properties: {
          titulo: { type: "string", minLength: 1 },
          descripcion: { type: "string", minLength: 1 },
          compromisoEsperado: { $ref: "#/components/schemas/Compromiso" },
          modalidadColaboracion: { type: "string", enum: ["GRATUITA", "OFRECE_INCENTIVO_ECONOMICO", "EXISTE_POSIBILIDAD_DE_CONTRATACION"], default: "GRATUITA" },
          habilidadesNecesarias: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
            example: ["desarrollo_node"],
          },
        },
      },

      ActualizarProyecto: {
        type: "object",
        additionalProperties: false,
        properties: {
          titulo: { type: "string", minLength: 1 },
          descripcion: { type: "string", minLength: 1 },
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
        },
      },

      ActualizarColaborador: {
        type: "object",
        additionalProperties: false,
        properties: {
          pronombres: { type: "array", items: { type: "string", minLength: 1 } },
          presentacion: { type: "string", nullable: true },
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
        properties: { colaboradorId: { type: "string", minLength: 1 } },
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
