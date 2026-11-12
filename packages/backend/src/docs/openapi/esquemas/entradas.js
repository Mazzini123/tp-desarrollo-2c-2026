// Parte de la especificacion OpenAPI. El documento se arma en ../index.js.
// Bodies que recibe la API en altas y modificaciones.

export const entradas = {
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
      ubicacion: {
        oneOf: [{ $ref: "#/components/schemas/Ubicacion" }, { type: "null" }],
      },
      redesSociales: {
        type: "array",
        maxItems: 10,
        items: { $ref: "#/components/schemas/RedSocial" },
      },
      etiquetas: {
        type: "array",
        maxItems: 10,
        items: { type: "string", maxLength: 30 },
      },
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
      ubicacion: {
        oneOf: [{ $ref: "#/components/schemas/Ubicacion" }, { type: "null" }],
      },
      redesSociales: {
        type: "array",
        items: { $ref: "#/components/schemas/RedSocial" },
      },
      etiquetas: { type: "array", items: { type: "string" } },
    },
  },

  CrearPerfil: {
    type: "object",
    required: ["descripcion", "codigosHabilidadesRequeridas", "compromiso"],
    additionalProperties: false,
    properties: {
      titulo: { type: "string", minLength: 1, maxLength: 80 },
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
        enum: [
          "GRATUITA",
          "OFRECE_INCENTIVO_ECONOMICO",
          "EXISTE_POSIBILIDAD_DE_CONTRATACION",
        ],
        default: "GRATUITA",
      },
      busquedaAbierta: { type: "boolean", default: true },
      fechaCierreBusqueda: {
        type: "string",
        format: "date-time",
        nullable: true,
        example: "2026-12-01T18:00:00-03:00",
      },
      limiteColaboraciones: { type: "integer", minimum: 1, nullable: true },
      modoAceptacion: {
        type: "string",
        enum: ["TODO_SUMA", "HASTA_LLENAR_VACANTES", "REVISION_MANUAL"],
        default: "REVISION_MANUAL",
        description:
          "TODO_SUMA solo sin limite, HASTA_LLENAR_VACANTES solo con limite, " +
          "REVISION_MANUAL con o sin.",
      },
    },
  },

  ActualizarPerfil: {
    type: "object",
    additionalProperties: false,
    minProperties: 1,
    properties: {
      titulo: { type: "string", minLength: 1, maxLength: 80 },
      descripcion: { type: "string", minLength: 1 },
      versionEdicion: { type: "string", pattern: "^[a-f0-9]{64}$" },
      codigosHabilidadesRequeridas: {
        type: "array",
        minItems: 1,
        items: { type: "string" },
      },
      codigosHabilidadesOpcionales: { type: "array", items: { type: "string" } },
      compromiso: { $ref: "#/components/schemas/Compromiso" },
      modalidadColaboracion: {
        type: "string",
        enum: [
          "GRATUITA",
          "OFRECE_INCENTIVO_ECONOMICO",
          "EXISTE_POSIBILIDAD_DE_CONTRATACION",
        ],
      },
      busquedaAbierta: { type: "boolean" },
      fechaCierreBusqueda: { type: "string", format: "date-time", nullable: true },
      limiteColaboraciones: { type: "integer", minimum: 1, nullable: true },
      modoAceptacion: {
        type: "string",
        enum: ["TODO_SUMA", "HASTA_LLENAR_VACANTES", "REVISION_MANUAL"],
      },
    },
  },

  HabilidadDePerfil: {
    type: "object",
    required: ["codigoHabilidad"],
    additionalProperties: false,
    properties: {
      codigoHabilidad: { type: "string", example: "testing_e2e_con_cypress" },
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
      etiquetas: {
        type: "array",
        maxItems: 10,
        items: { type: "string", maxLength: 30 },
      },
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
      fechaCierre: { type: "string", format: "date-time", nullable: true },
    },
  },

  CrearLogro: {
    type: "object",
    required: ["titulo", "descripcion"],
    additionalProperties: false,
    properties: {
      titulo: { type: "string", minLength: 1 },
      descripcion: { type: "string", minLength: 1 },
    },
  },

  ActualizarLogro: {
    type: "object",
    required: ["titulo", "descripcion"],
    additionalProperties: false,
    properties: {
      titulo: { type: "string", minLength: 1 },
      descripcion: { type: "string", minLength: 1 },
    },
  },

  CrearAvance: {
    type: "object",
    required: ["porcentajeConcrecion", "urlSistema", "urlRepositorio"],
    additionalProperties: false,
    properties: {
      porcentajeConcrecion: { type: "number", minimum: 0, maximum: 100 },
      urlSistema: {
        type: "string",
        format: "uri",
        description: "Solo http o https.",
        example: "https://mi-sistema.example.org",
      },
      urlRepositorio: {
        type: "string",
        format: "uri",
        description: "Solo http o https. El codigo tiene que ser publico.",
        example: "https://github.com/colectivo/proyecto",
      },
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
      redesSociales: {
        type: "array",
        items: { $ref: "#/components/schemas/RedSocial" },
      },
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
    required: ["colaboradorId", "perfilId"],
    additionalProperties: false,
    properties: {
      colaboradorId: { type: "string", minLength: 1 },
      perfilId: {
        type: "string",
        minLength: 1,
        description: "Perfil al que se postula.",
      },
      esPublica: {
        type: "boolean",
        default: true,
        description: "false = contribucion anonima.",
      },
    },
  },

  Invitacion: {
    type: "object",
    description:
      "Errores: 400 si el mensaje supera 500 caracteres; 409 si la persona ya fue invitada " +
      "a ese perfil, ya se postulo o no acepta mensajeria interna.",
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
};
