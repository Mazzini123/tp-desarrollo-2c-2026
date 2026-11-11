// Parte de la especificacion OpenAPI. El documento se arma en ../index.js.
// Recursos tal como los devuelve la API.

import { OBJECT_ID, PROBLEMA, META_PAGINACION } from "../comunes.js";

export const respuestas = {
  Problema: PROBLEMA,
  Contexto: {
    type: "object",
    nullable: true,
    properties: {
      id: OBJECT_ID,
      tipo: { type: "string", enum: ["COLABORADOR", "COLECTIVO"] },
      rol: { type: "string", enum: ["COLABORADOR", "MIEMBRO", "LIDER"] },
      colectivo: {
        type: "object",
        nullable: true,
        properties: { id: OBJECT_ID, nombre: { type: "string" } },
      },
      colaborador: {
        type: "object",
        nullable: true,
        properties: { id: OBJECT_ID, nombre: { type: "string" } },
      },
      permisos: { type: "array", items: { type: "string" } },
    },
  },
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

  // La copia de una habilidad del catalogo que guardan los perfiles y las
  // personas (desnormalizada): solo lo que se muestra.
  HabilidadEmbebida: {
    type: "object",
    properties: {
      codigo: { type: "string", example: "desarrollo_node" },
      titulo: { type: "string", example: "Desarrollo Node" },
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
      id: OBJECT_ID,
      nombre: { type: "string" },
      descripcion: { type: "string", description: "Admite Markdown (req. 38)." },
      tipoColectivo: {
        type: "string",
        enum: ["FUNDACION", "ASOCIACION_BARRIAL", "ONG", "ASAMBLEA"],
      },
      ubicacion: {
        oneOf: [{ $ref: "#/components/schemas/Ubicacion" }, { type: "null" }],
      },
      proyectos: {
        type: "array",
        maxItems: 20,
        items: { $ref: "#/components/schemas/ResumenProyecto" },
      },
      proyectosMeta: META_PAGINACION,
      redesSociales: {
        type: "array",
        items: { $ref: "#/components/schemas/RedSocial" },
      },
      etiquetas: { type: "array", items: { type: "string" }, example: ["ambiente"] },
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
      id: OBJECT_ID,
      versionEdicion: { type: "string", pattern: "^[a-f0-9]{64}$" },
      titulo: {
        type: "string",
        nullable: true,
        description:
          "Titulo corto del perfil (hasta 80 caracteres). null en perfiles viejos.",
      },
      estadoBusqueda: {
        type: "string",
        enum: ["ABIERTA", "LIMITE_ALCANZADO", "CERRADA"],
        description:
          "Calculado por el back: CERRADA si el proyecto esta finalizado o la busqueda " +
          "esta cerrada o vencida; LIMITE_ALCANZADO si las aceptadas llegaron al limite.",
      },
      descripcion: { type: "string" },
      compromiso: { $ref: "#/components/schemas/Compromiso" },
      modalidadColaboracion: {
        type: "string",
        enum: [
          "GRATUITA",
          "OFRECE_INCENTIVO_ECONOMICO",
          "EXISTE_POSIBILIDAD_DE_CONTRATACION",
        ],
      },
      habilidadesRequeridas: {
        type: "array",
        items: { $ref: "#/components/schemas/HabilidadEmbebida" },
      },
      habilidadesOpcionales: {
        type: "array",
        items: { $ref: "#/components/schemas/HabilidadEmbebida" },
      },
      busquedaAbierta: { type: "boolean" },
      fechaCierreBusqueda: { type: "string", format: "date-time", nullable: true },
      cantidadAceptadas: {
        type: "integer",
        description:
          "Total exacto de aceptadas por perfil en el detalle, independiente de la página; ausente en resúmenes.",
      },
      limiteColaboraciones: {
        type: "integer",
        nullable: true,
        description: "null = sin limite.",
      },
      modoAceptacion: {
        type: "string",
        enum: ["TODO_SUMA", "HASTA_LLENAR_VACANTES", "REVISION_MANUAL"],
      },
    },
  },

  Proyecto: {
    type: "object",
    properties: {
      id: OBJECT_ID,
      titulo: { type: "string" },
      descripcion: { type: "string", description: "Admite Markdown (req. 38)." },
      estado: { type: "string", enum: ["ABIERTO", "FINALIZADO"] },
      colectivo: {
        type: "object",
        description:
          "Colectivo que publica el proyecto. Se informa en el detalle y en los listados " +
          "de proyectos; no dentro de las respuestas de colectivos.",
        properties: {
          id: OBJECT_ID,
          nombre: { type: "string" },
          ubicacion: {
            oneOf: [{ $ref: "#/components/schemas/Ubicacion" }, { type: "null" }],
          },
        },
      },
      perfiles: { type: "array", items: { $ref: "#/components/schemas/Perfil" } },
      colaboraciones: {
        type: "array",
        items: { $ref: "#/components/schemas/Colaboracion" },
      },
      colaboracionesMeta: {
        ...META_PAGINACION,
        description:
          "Página embebida del detalle; privadas indica si se usó la vista del dueño.",
        properties: { ...META_PAGINACION.properties, privadas: { type: "boolean" } },
      },
      logros: { type: "array", items: { $ref: "#/components/schemas/Logro" } },
      avances: { type: "array", items: { $ref: "#/components/schemas/Avance" } },
      porcentajeConcrecion: { type: "number" },
      urlSistema: { type: "string", nullable: true },
      urlRepositorio: { type: "string", nullable: true },
      etiquetas: { type: "array", items: { type: "string" } },
      fechaCreacion: { type: "string", format: "date-time", nullable: true },
      fechaFinalizacion: { type: "string", format: "date-time", nullable: true },
      fechaCierre: {
        type: "string",
        format: "date-time",
        nullable: true,
        description:
          "Al llegar esta fecha se cierra solo (req. 10). Una fecha sin hora (`2026-12-01`) " +
          'se toma como el fin de ese dia en Argentina (23:59:59 -03:00); "hoy" cuenta como futura.',
      },
      visualizaciones: {
        type: "integer",
        description: "Visitas al detalle salvo las del contexto del colectivo dueño.",
      },
    },
  },

  Logro: {
    type: "object",
    description:
      "Titulo de hasta 100 caracteres, unico por proyecto sin distinguir mayusculas.",
    properties: {
      id: OBJECT_ID,
      titulo: { type: "string" },
      descripcion: { type: "string" },
      fecha: { type: "string", format: "date-time" },
    },
  },

  Avance: {
    type: "object",
    description:
      "El porcentaje es decimal y tiene que superar al del proyecto (422 si no). Los avances " +
      "no se editan ni se eliminan.",
    properties: {
      id: OBJECT_ID,
      porcentajeConcrecion: { type: "number", minimum: 0, maximum: 100 },
      urlSistema: { type: "string" },
      urlRepositorio: { type: "string" },
      fecha: { type: "string", format: "date-time" },
    },
  },

  Colaborador: {
    type: "object",
    description: "Los medios de contacto nunca forman parte de la respuesta.",
    properties: {
      id: OBJECT_ID,
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
      habilidades: {
        type: "array",
        items: { $ref: "#/components/schemas/HabilidadEmbebida" },
      },
      recibeMensajeriaInterna: { type: "boolean" },
      redesSociales: {
        type: "array",
        items: { $ref: "#/components/schemas/RedSocial" },
      },
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
      id: OBJECT_ID,
      colaborador: {
        nullable: true,
        allOf: [{ $ref: "#/components/schemas/Colaborador" }],
        description: "null si la contribucion es anonima.",
      },
      perfil: { ...OBJECT_ID, description: "Id del perfil al que se postulo." },
      esPublica: { type: "boolean" },
      fecha: {
        type: "string",
        format: "date-time",
        description: "Cuando se postulo.",
      },
      estado: {
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
      id: OBJECT_ID,
      destinatarioId: OBJECT_ID,
      tipo: {
        type: "string",
        enum: [
          "INVITACION",
          "PROYECTOS_COMPATIBLES",
          "POSTULACION_ACEPTADA",
          "POSTULACION_RECHAZADA",
          "COLABORACION_FINALIZADA",
          "DESVINCULACION",
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
        description:
          "Replica por cada medio de contacto. La manda un job fuera del pedido: nace " +
          "PENDIENTE y termina ENVIADO, SIMULADO (sin proveedor real) o FALLIDO después de 5 intentos.",
        items: {
          type: "object",
          properties: {
            canal: { type: "string", enum: ["EMAIL", "WHATSAPP", "SMS"] },
            estado: {
              type: "string",
              enum: ["PENDIENTE", "ENVIADO", "SIMULADO", "FALLIDO"],
            },
            exito: { type: "boolean", description: "true si quedo ENVIADO." },
            intentos: { type: "integer" },
          },
        },
      },
    },
  },

  ColaboradoraPotencial: {
    type: "object",
    description:
      "Cumple todas las habilidades requeridas del perfil y no tiene ninguna postulacion " +
      "en el proyecto. El orden es por cantidad de opcionales, de mayor a menor.",
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
          "AVANCE",
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
      avance: {
        type: "object",
        description: "Solo en los eventos AVANCE.",
        properties: {
          porcentajeConcrecion: { type: "number" },
          urlSistema: { type: "string" },
          urlRepositorio: { type: "string" },
        },
      },
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
      avancePromedio: {
        type: "number",
        description: "Porcentaje de concrecion promedio.",
      },
      logros: { type: "integer" },
      porProyecto: { type: "array", items: { type: "object" } },
      generadoEn: { type: "string", format: "date-time" },
    },
  },
};

// Proyecciones explícitas: no prometen historiales ausentes en las consultas de listado.
const camposResumen = [
  "id",
  "titulo",
  "descripcion",
  "estado",
  "porcentajeConcrecion",
  "etiquetas",
  "fechaCreacion",
  "fechaCierre",
  "colectivo",
  "perfiles",
];
respuestas.ResumenProyecto = {
  type: "object",
  properties: {
    ...Object.fromEntries(
      camposResumen.map((campo) => [campo, respuestas.Proyecto.properties[campo]]),
    ),
    postulacionesPendientes: {
      type: "integer",
      description: "Solo en la lista propia del colectivo.",
    },
  },
};
respuestas.ResumenColectivo = {
  type: "object",
  properties: {
    ...Object.fromEntries(
      Object.entries(respuestas.Colectivo.properties).filter(
        ([campo]) => !["proyectos", "proyectosMeta"].includes(campo),
      ),
    ),
    cantidadProyectos: { type: "integer" },
  },
};
respuestas.PostulacionPendiente = {
  type: "object",
  properties: {
    proyecto: {
      type: "object",
      properties: {
        id: OBJECT_ID,
        titulo: { type: "string" },
        estado: { type: "string" },
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
};
