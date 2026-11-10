// Piezas reutilizadas por las rutas y los esquemas de la especificacion OpenAPI.

export const OBJECT_ID = {
  type: "string",
  pattern: "^[a-f0-9]{24}$",
  example: "6720f1c2a1b2c3d4e5f60718",
};

export const PROBLEMA = {
  type: "object",
  properties: {
    message: { type: "string" },
    codigo: {
      type: "string",
      description:
        "Codigo estable para que el front distinga casos: NO_AUTENTICADO, TOKEN_INVALIDO, " +
        "PROVEEDOR_NO_DISPONIBLE, USUARIO_NO_REGISTRADO, CONTEXTO_REQUERIDO, " +
        "CONTEXTO_INVALIDO, CONTEXTO_NO_ACTUAL, CONTEXTO_INACTIVO, PERMISO_INSUFICIENTE, " +
        "MODALIDAD_INCOMPATIBLE, SOLICITUD_PENDIENTE, LIDER_DEBE_TRANSFERIR, entre otros.",
    },
    detalle: {
      description:
        "Solo en algunos errores: datos para resolverlo. Por ejemplo, en " +
        "ACTIVIDAD_EN_CURSO, la lista de postulaciones y colaboraciones que impiden la baja.",
    },
    issues: {
      type: "array",
      description: "Solo en errores de validacion: el detalle que devuelve Zod.",
      items: { type: "object" },
    },
  },
};

export const META_PAGINACION = {
  type: "object",
  properties: {
    page: { type: "integer", example: 1 },
    per_page: { type: "integer", example: 10 },
    total: { type: "integer", example: 12 },
    total_pages: { type: "integer", example: 2 },
    unread: {
      type: "integer",
      description: "Solo en la bandeja de mensajes: total de no leidas.",
    },
  },
};

export const errores = {
  400: {
    description:
      "Falla de forma: falto un campo obligatorio, sobro uno (los schemas son strict), " +
      "un tipo no coincide, o una regla de dominio rechazo el valor.",
    content: {
      "application/json": { schema: { $ref: "#/components/schemas/Problema" } },
    },
  },
  404: {
    description: "No existe el recurso referenciado por el id o el codigo de la ruta.",
    content: {
      "application/json": { schema: { $ref: "#/components/schemas/Problema" } },
    },
  },
  409: {
    description:
      "Conflicto con el estado actual: la operacion es valida pero el recurso no la admite " +
      "ahora (proyecto ya finalizado, colaborador ya anotado, pronombre repetido, " +
      "codigo de habilidad ya existente).",
    content: {
      "application/json": { schema: { $ref: "#/components/schemas/Problema" } },
    },
  },
};

errores[429] = {
  description:
    "Demasiadas solicitudes desde la misma IP (req. adicional 14). La cabecera `RateLimit` " +
    "informa el cupo y cuando se renueva.",
  content: { "application/json": { schema: { $ref: "#/components/schemas/Problema" } } },
};

export const paramEtiqueta = {
  name: "etiqueta",
  in: "query",
  description:
    "Filtra por etiqueta (req. adicional 34). Se normaliza igual que al cargarla: " +
    "`Educación Popular` busca `educacion-popular`.",
  schema: { type: "string" },
};

export const paramsFiltroDeProyectos = [
  paramEtiqueta,
  {
    name: "estado",
    in: "query",
    description: "ABIERTO o FINALIZADO. Sin el parametro se devuelven todos.",
    schema: { type: "string", enum: ["ABIERTO", "FINALIZADO"] },
  },
  {
    name: "habilidad",
    in: "query",
    description: "Codigo de una habilidad requerida u opcional de algun perfil.",
    schema: { type: "string" },
  },
  {
    name: "tipoColectivo",
    in: "query",
    description: "Tipo del colectivo que publica.",
    schema: {
      type: "string",
      enum: ["FUNDACION", "ASOCIACION_BARRIAL", "ONG", "ASAMBLEA"],
    },
  },
  {
    name: "ubicacion",
    in: "query",
    description:
      "Nombre exacto de la ubicacion del colectivo (una provincia del catalogo o una localidad).",
    schema: { type: "string" },
  },
  {
    name: "modalidad",
    in: "query",
    description: "Modalidad de colaboracion de algun perfil del proyecto.",
    schema: {
      type: "string",
      enum: [
        "GRATUITA",
        "OFRECE_INCENTIVO_ECONOMICO",
        "EXISTE_POSIBILIDAD_DE_CONTRATACION",
      ],
    },
  },
];

export const paramColaboracionId = {
  name: "colaboracionId",
  in: "path",
  required: true,
  schema: OBJECT_ID,
};

export const paramCodigoHabilidad = {
  name: "codigoHabilidad",
  in: "path",
  required: true,
  description: "Codigo de la habilidad en el catalogo, por ejemplo `desarrollo_node`.",
  schema: { type: "string" },
};

export const paramPerfilId = {
  name: "perfilId",
  in: "path",
  required: true,
  schema: OBJECT_ID,
};

export function arrayDe(nombreSchema, descripcion) {
  return {
    200: {
      description: descripcion,
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: { $ref: `#/components/schemas/${nombreSchema}` },
          },
        },
      },
    },
  };
}

export const paramsPaginacion = [
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

export const paramId = {
  name: "id",
  in: "path",
  required: true,
  schema: OBJECT_ID,
};

export function listado(nombreSchema) {
  return {
    200: {
      description: "Pagina de resultados.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: { $ref: `#/components/schemas/${nombreSchema}` },
              },
              meta: { $ref: "#/components/schemas/MetaPaginacion" },
            },
          },
        },
      },
    },
    400: errores[400],
  };
}

export function recurso(nombreSchema, codigo = 200, descripcion = "Operacion exitosa.") {
  return {
    [codigo]: {
      description: descripcion,
      content: {
        "application/json": { schema: { $ref: `#/components/schemas/${nombreSchema}` } },
      },
    },
  };
}

export function body(nombreSchema) {
  return {
    required: true,
    content: {
      "application/json": { schema: { $ref: `#/components/schemas/${nombreSchema}` } },
    },
  };
}
