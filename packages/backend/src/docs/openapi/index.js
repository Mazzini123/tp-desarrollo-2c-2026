// Especificacion OpenAPI de la API: se sirve en /docs y /openapi.json.
// Las rutas estan en rutas/ (un archivo por recurso) y los esquemas en esquemas/.

import { rutasHealth } from "./rutas/health.js";
import { rutasColectivos } from "./rutas/colectivos.js";
import { rutasColaboradores } from "./rutas/colaboradores.js";
import { rutasEstadisticas } from "./rutas/estadisticas.js";
import { rutasProyectos } from "./rutas/proyectos.js";
import { rutasCuenta } from "./rutas/cuenta.js";
import { rutasCatalogos } from "./rutas/catalogos.js";
import { rutasHabilidades } from "./rutas/habilidades.js";
import { respuestas } from "./esquemas/respuestas.js";
import { entradas } from "./esquemas/entradas.js";

export const openapi = {
  openapi: "3.0.3",
  security: [{}, { bearerAuth: [] }],
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
      "**Autenticacion.** Con `LOGTO_ENDPOINT` y `LOGTO_API_RESOURCE` configurados, las",
      "escrituras piden `Authorization: Bearer <access token de Logto>` y la API valida el",
      "JWT (emisor, audiencia y firma). Las lecturas publicas siguen abiertas. La cuenta",
      "puede crear un perfil de colaboradora nuevo despues de dar de baja el anterior.",
      "La API responde 401 sin sesion valida y 403 si falta autorizacion sobre el recurso.",
      "El modo sin autenticacion se habilita expresamente en development o test.",
      "",
      "**Persistencia.** MongoDB. Colectivos, proyectos y colaboraciones en colecciones",
      "propias; perfiles, logros y avances embebidos en el proyecto. Las respuestas siguen",
      "anidando los proyectos en el colectivo y las colaboraciones en el proyecto. Los",
      "colaboradores se referencian por id (populate) y de cada habilidad se guarda una",
      "copia con su codigo y titulo.",
      "Todos los ids son ObjectId (24 caracteres hexadecimales).",
      "",
      "**Segunda entrega.** Se suman perfiles, postulaciones con estado, contribuciones",
      "anonimas, medios de contacto (que nunca se muestran), notificaciones internas",
      "replicadas por email/WhatsApp/SMS, busqueda de colaboradoras, valoraciones,",
      "estadisticas, timeline, etiquetas y redes sociales.",
      "",
      "**Seguridad.** Todo texto que entra se limpia de HTML (req. adicional 11) y hay un",
      "limite de solicitudes por IP (req. adicional 14): 300 cada 15 minutos en general y 30",
      "por minuto en busquedas y estadisticas.",
      "",
      "**Autenticacion y contextos.** Las escrituras piden `Authorization: Bearer <access",
      "token>` del API resource. Al iniciar la sesion, el front llama a",
      "`POST /auth/registro` y luego a `GET /auth/me`, una consulta de solo lectura.",
      "Cada operacion en nombre de un colectivo o de una colaboradora",
      "manda ademas `X-Context-Id` con el contexto elegido, que tiene que ser el actual del",
      "usuario (`PUT /auth/contexto-actual`). El backend valida pertenencia, estado y el",
      "permiso del rol (COLABORADOR, MIEMBRO o LIDER) en cada pedido.",
    ].join("\n"),
  },
  servers: [
    { url: "http://localhost:8000", description: "Local" },
    { url: "http://147.15.102.156:8000", description: "Oracle Cloud (San Pablo)" },
  ],
  tags: [
    { name: "Health", description: "Estado del servicio." },
    {
      name: "Cuenta",
      description:
        "Registro, cuenta, contexto actual. Un usuario opera como colaboradora o en nombre " +
        "de uno o varios colectivos, nunca las dos cosas a la vez.",
    },
    {
      name: "Membresias",
      description:
        "Solicitudes de ingreso, miembros, abandono y liderazgo. Un colectivo tiene " +
        "exactamente un LIDER; los demas son MIEMBRO.",
    },
    { name: "Colectivos", description: "Organizaciones que publican proyectos." },
    {
      name: "Proyectos",
      description:
        "Viven dentro de un colectivo: un proyecto sin colectivo no existe, por eso se " +
        "crean desde POST /colectivos/{id}/proyectos y se consultan por su id propio.",
    },
    {
      name: "Perfiles",
      description:
        "CRUD de los perfiles de un proyecto (req. minimo 3.a). Cada perfil tiene una " +
        "descripcion, una o mas habilidades requeridas, habilidades opcionales, un " +
        "compromiso y una modalidad de colaboracion. Solo se modifican en proyectos abiertos.",
    },
    { name: "Colaboradores", description: "Personas que se anotan a los proyectos." },
    { name: "Habilidades", description: "Catalogo precargado por el administrador." },
    {
      name: "Postulaciones",
      description:
        "Las personas se postulan a un perfil del proyecto. Segun el modo de aceptacion del " +
        "perfil, la postulacion se resuelve sola o queda pendiente (req. adicional 8). Una " +
        "colaboracion aceptada se puede desvincular, de forma permanente. Al terminar, las " +
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
    ...rutasHealth,
    ...rutasColectivos,
    ...rutasColaboradores,
    ...rutasEstadisticas,
    ...rutasProyectos,
    ...rutasCuenta,
    ...rutasCatalogos,
    ...rutasHabilidades,
  },

  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      contexto: {
        type: "apiKey",
        in: "header",
        name: "X-Context-Id",
        description: "Contexto con el que se opera; tiene que ser el actual del usuario.",
      },
    },
    schemas: {
      ...respuestas,
      ...entradas,
    },
  },
};
