// Parte de la especificacion OpenAPI. El documento se arma en ../index.js.

import {
  OBJECT_ID,
  errores,
  paramEtiqueta,
  arrayDe,
  paramsPaginacion,
  paramId,
  listado,
  recurso,
  body,
} from "../comunes.js";

export const rutasColectivos = {
  "/colectivos": {
    post: {
      tags: ["Colectivos"],
      summary: "Crear colectivo",
      description:
        "`nombre`, `descripcion` y `tipoColectivo` son obligatorios. `ubicacion` es " +
        "opcional pero condicionada: si `tipoUbicacion` es PROVINCIA, `nombre` tiene que " +
        "ser una de las 23 provincias argentinas; si es LOCALIDAD, `nombre` es obligatorio (422 si no). " +
        "Opcionales: `redesSociales` (req. 27, solo URLs http/https), `etiquetas` (req. 34, " +
        "se normalizan) y `mediosDeContacto`. Con autenticacion activa se requiere un " +
        "usuario registrado con nombre propio. Se crea su contexto LIDER y se selecciona.",
      requestBody: body("CrearColectivo"),
      responses: {
        ...recurso("Colectivo", 201, "Colectivo creado."),
        400: errores[400],
        422: errores[422],
        401: errores[401],
        403: errores[403],
        409: errores[409],
      },
    },
    get: {
      tags: ["Colectivos"],
      summary: "Listar colectivos",
      description:
        "No incluye a los colectivos dados de baja; su detalle por id sigue disponible.",
      parameters: [...paramsPaginacion, paramEtiqueta],
      responses: listado("ResumenColectivo"),
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
        "alta. Las listas (`redesSociales`, `etiquetas`) se reemplazan completas. " +
        "La edicion de medios de contacto esta suspendida. Un colectivo dado de baja " +
        "no se puede modificar (409).",
      requestBody: body("ActualizarColectivo"),
      responses: {
        ...recurso("Colectivo"),
        400: errores[400],
        422: errores[422],
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
        "codigos tienen que existir (404) y estar activos (422)). Cada perfil define su busqueda, " +
        "su limite de colaboraciones y su modo de aceptacion (ver CrearPerfil). " +
        "`fechaCierre` (req. 10) tiene que ser futura (422). Al crearlo, " +
        "se avisa a las personas compatibles (req. 9). Un colectivo dado de baja no puede " +
        "publicar proyectos (409). Repetir la clave con el mismo cuerpo devuelve el proyecto " +
        "existente sin volver a enviar avisos. Con otros datos responde 409.",
      parameters: [
        {
          name: "Idempotency-Key",
          in: "header",
          description: "UUID opcional. Reutilizarlo al reintentar la misma publicacion.",
          schema: { type: "string", format: "uuid" },
        },
      ],
      requestBody: body("CrearProyecto"),
      responses: {
        ...recurso("Proyecto", 201, "Proyecto creado o recuperado por su clave."),
        400: errores[400],
        422: errores[422],
        404: errores[404],
        409: errores[409],
      },
    },
    get: {
      tags: ["Proyectos"],
      summary: "Listar proyectos del colectivo",
      description:
        "Resúmenes sin historial. El contexto dueño recibe postulacionesPendientes por proyecto y meta.perfiles_abiertos global.",
      parameters: paramsPaginacion,
      responses: { ...listado("ResumenProyecto"), 404: errores[404] },
    },
  },
  "/colectivos/{id}/postulaciones": {
    get: {
      tags: ["Postulaciones"],
      summary: "Postulaciones pendientes de todo el colectivo",
      description:
        "Página independiente de la lista de proyectos. Solo el colectivo dueño con POSTULACION_RESOLVER; conserva anonimato.",
      security: [{ bearerAuth: [], contexto: [] }],
      parameters: [paramId, ...paramsPaginacion],
      responses: {
        ...listado("PostulacionPendiente"),
        401: errores[401],
        403: errores[403],
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
        "Requiere el contexto actual del lider de ese colectivo. En modo sin autenticacion " +
        "la ruta no se registra. Darlo de baja dos veces responde 409.",
      responses: {
        ...recurso("Colectivo", 200, "Colectivo dado de baja."),
        400: errores[400],
        401: errores[401],
        403: errores[403],
        404: errores[404],
        409: errores[409],
      },
    },
  },

  "/colectivos/{id}/solicitudes-ingreso": {
    parameters: [paramId],
    post: {
      tags: ["Membresias"],
      summary: "Pedir el ingreso al colectivo",
      description:
        "La pide el usuario por si mismo: no lleva X-Context-Id. Una solicitud pendiente " +
        "no da ningun permiso. 409 si ya es miembro, si ya tiene una pendiente, si el " +
        "colectivo esta dado de baja, si opera como colaboradora o si todavia no cargo " +
        "su nombre (NOMBRE_REQUERIDO).",
      responses: {
        201: { description: "Solicitud PENDIENTE." },
        404: errores[404],
        409: errores[409],
      },
    },
    get: {
      tags: ["Membresias"],
      summary: "Consultar solicitudes del colectivo (miembro o lider)",
      parameters: [
        {
          name: "estado",
          in: "query",
          schema: {
            type: "string",
            enum: ["PENDIENTE", "ACEPTADA", "RECHAZADA", "CANCELADA"],
          },
        },
      ],
      responses: {
        200: { description: "Solicitudes, con el nombre de quien la pidio." },
      },
    },
  },

  "/colectivos/{id}/solicitudes-ingreso/{solicitudId}/aceptacion": {
    parameters: [
      paramId,
      { name: "solicitudId", in: "path", required: true, schema: OBJECT_ID },
    ],
    post: {
      tags: ["Membresias"],
      summary: "Aceptar una solicitud (lider)",
      description:
        "Crea o reactiva el contexto de la persona como MIEMBRO, en la misma transaccion " +
        "que resuelve la solicitud. No cambia su contexto actual.",
      responses: {
        200: { description: "`{ solicitud, miembro: { contextoId, rol } }`" },
        409: errores[409],
      },
    },
  },

  "/colectivos/{id}/solicitudes-ingreso/{solicitudId}/rechazo": {
    parameters: [
      paramId,
      { name: "solicitudId", in: "path", required: true, schema: OBJECT_ID },
    ],
    post: {
      tags: ["Membresias"],
      summary: "Rechazar una solicitud (lider)",
      responses: { 200: { description: "Solicitud RECHAZADA." }, 409: errores[409] },
    },
  },

  "/colectivos/{id}/solicitudes-ingreso/{solicitudId}/cancelacion": {
    parameters: [
      paramId,
      { name: "solicitudId", in: "path", required: true, schema: OBJECT_ID },
    ],
    post: {
      tags: ["Membresias"],
      summary: "Cancelar la propia solicitud pendiente",
      responses: {
        200: { description: "Solicitud CANCELADA." },
        404: errores[404],
        409: errores[409],
      },
    },
  },

  "/colectivos/{id}/miembros": {
    parameters: [paramId],
    get: {
      tags: ["Membresias"],
      summary: "Consultar miembros del colectivo",
      description: "Disponible para MIEMBRO y LIDER del colectivo del contexto actual.",
      responses: {
        200: { description: "`[{ contextoId, usuarioId, nombre, rol, fechaAlta }]`" },
        400: errores[400],
        401: errores[401],
        403: errores[403],
        409: errores[409],
      },
    },
  },

  "/colectivos/{id}/miembros/{contextoId}": {
    parameters: [
      paramId,
      { name: "contextoId", in: "path", required: true, schema: OBJECT_ID },
    ],
    delete: {
      tags: ["Membresias"],
      summary: "Quitar a un miembro (lider)",
      description:
        "Para quitar al lider, primero debe transferir el liderazgo a otro miembro.",
      responses: {
        204: { description: "Quitado." },
        404: errores[404],
        409: errores[409],
      },
    },
  },

  "/colectivos/{id}/abandono": {
    parameters: [paramId],
    post: {
      tags: ["Membresias"],
      summary: "Dejar el colectivo",
      description:
        "Un MIEMBRO sale directo. El LIDER recibe 409 LIDER_DEBE_TRANSFERIR si hay otros " +
        "miembros, o LIDER_UNICO_MIEMBRO si es el unico (en ese caso, dar de baja el colectivo).",
      responses: { 204: { description: "Ya no es miembro." }, 409: errores[409] },
    },
  },

  "/colectivos/{id}/lider": {
    parameters: [paramId],
    post: {
      tags: ["Membresias"],
      summary: "Pasar el liderazgo a otro miembro (lider)",
      description:
        "Atomico: el lider pasa a MIEMBRO y el elegido a LIDER en una transaccion. Nunca " +
        "hay dos lideres ni ninguno.",
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
        200: { description: "`{ liderAnterior, liderNuevo }` (ids de contexto)." },
        404: { description: "DESTINO_INVALIDO: no es miembro activo del colectivo." },
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
        "del colectivo, proyectos creados y finalizados, logros, avances (porcentaje de " +
        "concrecion) y colaboraciones cerradas.",
      responses: {
        ...arrayDe("EventoTimeline", "Eventos en orden cronologico."),
        404: errores[404],
      },
    },
  },

  "/colectivos/{id}/estadisticas": {
    parameters: [paramId],
    get: {
      tags: ["Estadisticas"],
      summary: "Panel de estadisticas del colectivo",
      description:
        "Req. adicional 17: proyectos, colaboraciones por estado, visualizaciones, avance " +
        "promedio (porcentaje de concrecion) y logros, en total y por proyecto. " +
        "Solo la consulta el colectivo dueño (401 sin sesion, 403 si es otro).",
      responses: {
        ...recurso("EstadisticasColectivo"),
        404: errores[404],
        429: errores[429],
      },
    },
  },

  "/colectivos/{id}/medios-de-contacto": {
    parameters: [paramId],
    get: {
      tags: ["Colectivos"],
      summary: "Leer los medios de contacto del colectivo",
      description:
        "Solo con la autenticacion activa y solo el propio colectivo (403 si no).",
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
        403: { description: "No es el propio colectivo." },
      },
    },
    post: {
      tags: ["Colectivos"],
      summary: "Agregar un medio de contacto al colectivo",
      description: "Solo con la autenticacion activa. 409 si ya lo tiene.",
      requestBody: body("MedioDeContacto"),
      responses: {
        201: { description: "Medio agregado." },
        401: { description: "Sin sesion." },
        403: { description: "No es el propio colectivo." },
        409: errores[409],
      },
    },
  },

  "/colectivos/{id}/medios-de-contacto/{tipo}/{valor}": {
    delete: {
      tags: ["Colectivos"],
      summary: "Quitar un medio de contacto del colectivo",
      description: "Solo con la autenticacion activa y solo el propio colectivo.",
      parameters: [
        paramId,
        { name: "tipo", in: "path", required: true, schema: { type: "string" } },
        { name: "valor", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        204: { description: "Medio quitado." },
        401: { description: "Sin sesion." },
        403: { description: "No es el propio colectivo." },
        404: errores[404],
      },
    },
  },
};
