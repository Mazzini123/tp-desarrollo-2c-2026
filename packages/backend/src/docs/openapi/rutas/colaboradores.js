// Parte de la especificacion OpenAPI. El documento se arma en ../index.js.

import {
  OBJECT_ID,
  errores,
  paramsPaginacion,
  paramId,
  listado,
  recurso,
  body,
} from "../comunes.js";

export const rutasColaboradores = {
  "/colaboradores/{id}/baja": {
    parameters: [paramId],
    post: {
      tags: ["Colaboradores"],
      summary: "Dar de baja el perfil de colaboradora",
      description:
        "Baja logica: el perfil y su historial se conservan (sigue respondiendo GET, con " +
        "`fechaBaja`), pero su contexto deja de servir para operar y la persona deja de " +
        "aparecer en busquedas, avisos e invitaciones. No cancela nada por su cuenta: con " +
        "postulaciones pendientes o colaboraciones aceptadas responde 409 " +
        "ACTIVIDAD_EN_CURSO y `detalle` las lista. Para volver puede crear un perfil nuevo " +
        "con la misma cuenta. El perfil anterior queda como historial.",
      responses: {
        200: { description: "Perfil dado de baja." },
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
        "`apellido` juntos. Si no, la respuesta es 422. Los `pronombres` repetidos del " +
        "payload se descartan en silencio. `mediosDeContacto` se registran pero **nunca " +
        "se muestran** en ninguna respuesta. `recibeMensajeriaInterna` (default true) " +
        "decide si se le pueden mandar notificaciones. Al crearla, se le avisa que " +
        "proyectos abiertos le sirven (req. 9). Con autenticacion activa se requiere un " +
        "usuario registrado. El contexto nuevo pasa a ser el actual. La cuenta puede tener " +
        "perfiles anteriores dados de baja, pero recibe 409 si ya tiene uno activo o si " +
        "opera como colectivo.",
      requestBody: body("CrearColaborador"),
      responses: {
        ...recurso("Colaborador", 201, "Colaborador creado."),
        400: errores[400],
        422: errores[422],
        401: errores[401],
        403: errores[403],
        404: errores[404],
        409: errores[409],
      },
    },
    get: {
      tags: ["Colaboradores"],
      summary: "Listar colaboradores",
      description:
        "No incluye a las colaboradoras dadas de baja; su detalle por id sigue disponible.",
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
        "Idempotente. El codigo tiene que existir en el catalogo (404) y estar activo (422).",
      requestBody: body("AgregarHabilidad"),
      responses: {
        ...recurso("Colaborador"),
        400: errores[400],
        404: errores[404],
        422: errores[422],
      },
    },
  },

  "/colaboradores/{id}/habilidades/{codigoHabilidad}": {
    parameters: [
      paramId,
      {
        name: "codigoHabilidad",
        in: "path",
        required: true,
        schema: { type: "string" },
      },
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
        "Cada item trae el `proyectoId`, un resumen del proyecto y del perfil, y la " +
        "colaboracion, porque esta vive dentro del proyecto y por si sola no dice a cual pertenece.",
      responses: {
        200: {
          description:
            "Colaboraciones del colaborador, con el proyecto al que pertenecen.",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    proyectoId: OBJECT_ID,
                    proyecto: {
                      type: "object",
                      properties: {
                        id: OBJECT_ID,
                        titulo: { type: "string" },
                        estado: { type: "string", enum: ["ABIERTO", "FINALIZADO"] },
                      },
                    },
                    perfil: {
                      type: "object",
                      nullable: true,
                      properties: {
                        id: OBJECT_ID,
                        titulo: { type: "string", nullable: true },
                        descripcion: { type: "string" },
                      },
                    },
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
    get: {
      tags: ["Colaboradores"],
      summary: "Leer los propios medios de contacto",
      description:
        "Solo con la autenticacion activa y solo la propia persona (403 si no).",
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
        403: { description: "No es la propia persona." },
      },
    },
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
      responses: {
        204: { description: "Medio quitado." },
        400: errores[400],
        404: errores[404],
      },
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
      description:
        "De la mas nueva a la mas vieja. `meta.unread` trae el total de no leidas de la " +
        "persona, sin importar el filtro. Las notificaciones son solo de personas " +
        "colaboradoras: los colectivos no tienen bandeja.",
      parameters: [
        ...paramsPaginacion,
        {
          name: "leida",
          in: "query",
          description:
            "`true` solo leidas, `false` solo no leidas. Sin el parametro, todas.",
          schema: { type: "boolean" },
        },
      ],
      responses: { ...listado("Notificacion"), 404: errores[404] },
    },
  },

  "/colaboradores/{id}/notificaciones/{notificacionId}/lectura": {
    parameters: [
      paramId,
      {
        name: "notificacionId",
        in: "path",
        required: true,
        schema: { type: "string" },
      },
    ],
    post: {
      tags: ["Notificaciones"],
      summary: "Marcar una notificacion como leida",
      description:
        "Una notificacion de otra persona responde 404, igual que una inexistente.",
      responses: { ...recurso("Notificacion"), 404: errores[404] },
    },
  },
};
