# Código a Voluntad — TP Integrador DDS 2C 2026

Plataforma que conecta colectivos (fundaciones, ONGs, asambleas, organizaciones
territoriales) con personas colaboradoras del ámbito del desarrollo de software.

## Documentación

**API REST:** generada con Swagger a partir de la especificación OpenAPI del
repositorio. Con el backend levantado:

- UI navegable y probable: <http://localhost:8000/docs>
- Especificación cruda: <http://localhost:8000/openapi.json>
- Fuente: `packages/backend/src/docs/openapi/` (`index.js` arma el documento; `rutas/` tiene un archivo por recurso y `esquemas/` los schemas de respuestas y de entradas)

**Diagrama de clases:** `diagrama_clases/diagrama_clases.puml` (PlantUML) y su
render en `diagrama_clases/diagrama_clases.png`.

**Documentación arquitectónica:**
[Google Drive](https://drive.google.com/drive/folders/1bh2M-NIkymUHaHRwEcv2dzRxbNwmOpFu)

## Estructura

Monorepo con npm workspaces. El frontend (React + Vite) vive en su propio
repositorio: [codigo-a-voluntad-front](https://github.com/Mazzini123/codigo-a-voluntad-front).

```
packages/
├── backend/     Node.js + Express (API JSON)
```

El backend sigue una arquitectura de capas:

| Capa                 | Responsabilidad                                                                                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/domain`         | Las entidades, con un dominio anémico: solo datos y operaciones estructurales (agregar/quitar, buscar por id, predicados y cambios de estado, conteos). Incluye los enums propios del negocio                    |
| `src/services`       | Reglas de negocio, casos de uso, transacciones y coordinación. Incluye altas, bajas y membresías con `ModalidadService` y `MembresiaService`; módulos de reglas compartidas y funciones auxiliares en `soporte/` |
| `src/repositories`   | Repositorios de negocio en MongoDB                                                                                                                                                                               |
| `src/models`         | Esquemas de los documentos de negocio y `loadClass` de las clases de dominio                                                                                                                                     |
| `src/security`       | Proveedores, identidad interna, contextos, roles, permisos, middlewares M1–M3 y su persistencia                                                                                                                  |
| `src/controllers`    | Traducción HTTP ↔ servicios                                                                                                                                                                                      |
| `src/routes`         | Definición de endpoints y middlewares por ruta                                                                                                                                                                   |
| `src/middlewares`    | Validación, sanitización, límite de solicitudes, 404 y manejo de errores                                                                                                                                         |
| `src/canales`        | Adaptadores de salida hacia servicios externos: email (nodemailer), WhatsApp y SMS                                                                                                                               |
| `src/jobs`           | Cierre de proyectos, generación durable de avisos y entrega de notificaciones                                                                                                                                    |
| `src/config`         | Configuración de entorno, conexión a MongoDB, transacciones y apagado de la API                                                                                                                                  |
| `src/schemas`        | Schemas de Zod: la forma de lo que entra por HTTP                                                                                                                                                                |
| `src/docs/openapi`   | Especificación OpenAPI (Swagger), partida por recurso                                                                                                                                                            |
| `src/composicion.js` | Raíz de composición: el único lugar que elige implementaciones                                                                                                                                                   |

**Dominio anémico.** Siguiendo el lineamiento de la cátedra, las entidades no
tienen lógica de negocio: solo operaciones estructurales simples que no cambian
nunca (agregar o quitar un perfil, buscar una colaboración, contar las aceptadas,
pasar una colaboración a ACEPTADA con su fecha). Las reglas —cuándo un perfil
recibe postulaciones, quién cumple un perfil, quién ve los datos de contacto, qué
pasa al dar de baja un colectivo— están en `src/services`. Las reglas compartidas
se agrupan en `reglasDeBusqueda.js` y `reglasDePostulacion.js`, que trabajan en
memoria. Los servicios coordinan su aplicación, la persistencia y las transacciones.
Los virtuales y los DTOs reutilizan esos módulos de reglas. `services/soporte`
contiene funciones auxiliares compartidas, como buscar un recurso o informar que
no existe y generar las notificaciones de una resolución.

La regla es que las dependencias apuntan siempre hacia adentro: los controllers
conocen a los services, los services a los modelos y a los repositories, y el
dominio no conoce a nadie.

Mongoose agrega los métodos de las entidades de dominio a los documentos mediante
`loadClass`. Los services usan los repositorios para crear, consultar y guardar
entidades. Las pruebas de persistencia y HTTP usan un MongoDB real con replica set.

Ningún controller ni service importa del contenedor: las dependencias entran
únicamente por constructor y se arman en `composicion.js`.

### Persistencia (MongoDB)

Mongoose es un **ODM** (_Object Document Mapper_): mapea objetos a documentos
(no a tablas, como un ORM).

**Una sola abstracción por entidad.** Cada schema de `src/models` carga su
clase de `src/domain` con `schema.loadClass(Clase)`:

```
src/domain/Proyecto.js        →  operaciones estructurales sobre sus datos
src/models/ProyectoModel.js   →  cómo se GUARDA (campos, defaults, índices)
                                 + proyectoSchema.loadClass(Proyecto)
```

Lo que devuelve Mongoose ya es un `Proyecto` con sus métodos
(`proyecto.agregarPerfil(datos)`, `proyecto.buscarColaboracion(id)`), así que los repositorios no traducen nada:
buscan con `find`/`findById` y guardan con `save()`. Las clases de dominio no
tienen constructor (Mongoose no lo llama): los valores por defecto están en el
schema. Las entidades se crean con el modelo (`new ColaboradorModel({...})`) o
desde su repositorio (`colectivoRepository.crear(datos)`, `proyectoRepository.nuevo(datos)`).

| Colección                  | Qué guarda                                                     | Relaciones                                                                                                              |
| -------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `habilidads`               | El catálogo                                                    | `codigo` único (`desarrollo_node`), aparte del `_id`                                                                    |
| `colaboradors`             | Colaboradores                                                  | Copia `{codigo, titulo}` de sus habilidades                                                                             |
| `colectivos`               | El colectivo                                                   | —                                                                                                                       |
| `proyectos`                | El proyecto **con sus perfiles, logros y avances embebidos**   | `colectivoId` por referencia, más una copia de nombre, tipo y ubicación del colectivo; copia de habilidades en perfiles |
| `colaboraciones`           | Postulaciones y colaboraciones                                 | `proyectoId`, `colectivoId` y `colaborador` por referencia (ObjectId)                                                   |
| `notificaciones`           | Los mensajes internos de cada persona                          | `destinatarioId` por referencia (ObjectId)                                                                              |
| `acciones_administrativas` | Auditoría: una fila por acción administrativa, solo se agregan | `usuarioId` y `contextoId` por referencia (nulos si la acción vino del comando)                                         |
| `revisiones`               | Cola de revisiones manuales de proyectos                       | `proyectoId` por referencia                                                                                             |
| `controles`                | Documento de control para serializar los destacados            | —                                                                                                                       |

(Los nombres en inglés "mal pluralizados" los pone Mongoose solo.)

Decisiones:

- **`_id` autogenerado.** Ningún schema pisa el `_id`: Mongoose genera un
  ObjectId para cada documento y subdocumento, y el virtual `id` lo expone
  como texto. Una clave de dominio va en otro campo con `unique` (el `codigo`
  de la habilidad), y se busca por ese campo.
- **Proyectos y colaboraciones en sus propias colecciones** (migración 002).
  Crecen sin límite y se consultan por separado (`/proyectos`, búsquedas,
  historial de cada persona), que es el criterio del libro para referenciar
  en lugar de embeber (Tabla 13.4). Perfiles, logros y avances siguen
  embebidos en el proyecto: se leen siempre con él.
- **El proyecto lleva una copia de su colectivo** (nombre, tipo, ubicación):
  es lo que muestra y por lo que se filtra. `ColectivoService.actualizar` la
  actualiza en todos sus proyectos dentro de la misma transacción cuando el colectivo cambia.
- **Comandos y lecturas tienen contratos distintos.** Para modificar, el repositorio
  reconstruye el agregado completo con sus colaboraciones. Los listados devuelven
  resúmenes con proyecciones y el detalle solo la primera página del historial.
  Nunca se guarda una proyección parcial. Ver [el contrato de repositorios](packages/backend/CONTRATO-REPOSITORIOS.md).
- **Habilidades desnormalizadas.** Perfiles y personas guardan una copia
  `{codigo, titulo}` de cada habilidad. El catálogo es precargado y una
  habilidad no cambia de título, así que no hace falta ir a buscarla cada vez
  (ni con un join a mano ni con `populate`), y las búsquedas filtran directo
  por `habilidades.codigo`.
- **Notificaciones en su propia colección**, no embebidas en el colaborador:
  crecen sin límite y se consultan paginadas.
- **Concurrencia optimista por proyecto** (`__v` + `optimisticConcurrency`):
  el repositorio sube la versión del proyecto en cada guardado, aunque solo
  cambien sus colaboraciones. Si dos pedidos lo modifican a la vez, el
  segundo recibe 409 (`ConcurrenciaError`) en vez de pisar al primero o pasarse
  del cupo. Cambios en proyectos distintos ya no chocan entre sí.
- **`toJSON` por schema** (`models/formatoJSON.js`): `id` en vez de `_id`, sin
  `__v`, sin los medios de contacto de las personas y sin el autor de una
  contribución anónima.
- **Campos calculados.** `porcentajeConcrecion`, `urlSistema` y
  `urlRepositorio` del proyecto se guardan, pero los calcula un hook
  `pre('validate')` a partir del último avance.
- **Búsquedas en la base, con índices.** Los proyectos potenciales son un
  `find` sobre `proyectos` (cada perfil guarda `cupoCompleto`, que el
  repositorio recalcula al guardar); las colaboradoras potenciales, una
  agregación sobre `colaboradors`.
- **Envíos externos por job.** Una notificación se guarda con sus envíos
  (email, WhatsApp, SMS) en estado `PENDIENTE`; `jobs/enviosPendientes.js` los
  manda fuera del pedido HTTP, con límite de tiempo, reintentos con espera
  creciente y estado final `ENVIADO`, `SIMULADO` o `FALLIDO`. Las reservas tienen
  un token único y solo su dueño puede confirmar el resultado.

## Segunda entrega: qué hace la API

La documentación completa de cada ruta está en Swagger (`/docs`). Este es el
mapa, con el requerimiento del enunciado que resuelve cada cosa.

### Requerimientos mínimos

| Funcionalidad                                                  | Rutas                                                                                      |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Perfiles (CRUD)                                                | `/proyectos/:id/perfiles...`                                                               |
| Logros (CRUD)                                                  | `/proyectos/:id/logros` y `/proyectos/:id/logros/:logroId`                                 |
| Avances: porcentaje de concreción y enlaces, con historial     | `POST /proyectos/:id/avances` (solo se agregan), `GET /proyectos/:id/avances`              |
| Medios de contacto: se registran pero **nunca se muestran**    | `POST /colaboradores/:id/medios-de-contacto`, `DELETE .../medios-de-contacto/:tipo/:valor` |
| Contribuciones anónimas                                        | `esPublica: false` en `POST /proyectos/:id/colaboraciones`                                 |
| Búsqueda de colaboradoras según un perfil                      | `GET /proyectos/:id/perfiles/:perfilId/colaboradoras-potenciales`                          |
| Contactarlas (mensaje interno)                                 | `POST /proyectos/:id/perfiles/:perfilId/invitaciones`                                      |
| Búsqueda de proyectos según las habilidades de la colaboradora | `GET /colaboradores/:id/proyectos-potenciales`                                             |
| Notificaciones internas, replicadas por email/WhatsApp/SMS     | `GET /colaboradores/:id/notificaciones`, `POST .../notificaciones/:notificacionId/lectura` |

### Requerimientos adicionales

| #      | Requerimiento                                    | Cómo                                                                                                                                                                       |
| ------ | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8      | Aceptación y rechazo automático de postulaciones | `modoAceptacion` y `limiteColaboraciones` en cada perfil; `POST .../colaboraciones/:colaboracionId/aceptacion` y `/rechazo`                                                |
| 9      | Notificaciones automáticas                       | Al crear un proyecto se avisa a las personas compatibles; al crear una persona, se le avisa qué proyectos le sirven                                                        |
| 10     | Cierre automático de proyectos                   | `fechaCierre` en el proyecto; `src/jobs/cierreAutomatico.js` revisa cada minuto                                                                                            |
| 11     | Sanitización                                     | Quita los elementos HTML de los textos y conserva el texto con ángulos que no es HTML (`Array<string>`, `x<y`); en campos Markdown conserva código y autolinks             |
| 14     | Límite de solicitudes                            | `src/middlewares/limiteDeTasa.js`: 300 cada 15 min por IP; 30 por minuto en búsquedas y estadísticas                                                                       |
| 16, 30 | Estadísticas globales / API pública              | `GET /estadisticas`, con el Aggregation Framework                                                                                                                          |
| 17     | Estadísticas por organización                    | `GET /colectivos/:id/estadisticas`; `GET /proyectos/:id` suma visualizaciones                                                                                              |
| 18     | Proyectos destacados                             | `PUT/DELETE /administracion/proyectos/:id/destacado`, `GET /proyectos/destacados`; los listados ordenan primero los vigentes y los marcan con `destacado: true`            |
| 19     | Línea de tiempo                                  | `GET /colectivos/:id/timeline`: alta, proyectos, logros, avances, colaboraciones cerradas y baja                                                                           |
| 23     | Eliminación de colectivos                        | `POST /colectivos/:id/baja`                                                                                                                                                |
| 27     | Redes sociales                                   | `redesSociales` en colectivos y colaboradores                                                                                                                              |
| 34     | Etiquetas                                        | `etiquetas` en colectivos y proyectos; filtro `?etiqueta=` en los listados                                                                                                 |
| 35     | Seguimiento de proyectos sin actualizaciones     | Job `src/jobs/seguimiento.js`; `GET /administracion/revisiones`, `POST /administracion/revisiones/:id/resolucion`                                                          |
| 38     | Markdown (backend)                               | Las descripciones conservan la sintaxis Markdown y limpian HTML externo al código; el renderizado es del [frontend](https://github.com/Mazzini123/codigo-a-voluntad-front) |
| 39     | Valoraciones mutuas                              | `POST .../colaboraciones/:colaboracionId/finalizacion` y `/valoraciones`; `GET /colaboradores/:id/valoraciones`, `GET /colectivos/:id/valoraciones`                        |

Los adicionales 18 y 35 se resuelven con el rol de administración (ver
[Administración de la plataforma](#administración-de-la-plataforma)). Los adicionales 13
(solo la parte de auditoría y destacados), 21 y 29 quedan para una próxima entrega: se
apoyan en esa misma base.

### Ciclo de una postulación

Una persona se postula a un **perfil** del proyecto (`perfilId`), y solo si la
búsqueda de ese perfil está abierta (`busquedaAbierta`) y no venció
(`fechaCierreBusqueda`). Cada perfil tiene su propio límite de colaboraciones
aceptadas (`limiteColaboraciones`, opcional) y su propio modo de aceptación.

```
                ┌──────────▶ ACEPTADA ──┬──────▶ FINALIZADA ───▶ se pueden valorar
  se postula ──▶ PENDIENTE              └──────▶ DESVINCULADA
                └──────────▶ RECHAZADA
```

| Modo                            | Límite        | Qué pasa                                                                                                                  |
| ------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `REVISION_MANUAL` (por defecto) | opcional      | Nada automático: el colectivo acepta o rechaza. Alcanzado el límite, no se puede aceptar a nadie más                      |
| `TODO_SUMA`                     | no se permite | Se acepta en el momento                                                                                                   |
| `HASTA_LLENAR_VACANTES`         | obligatorio   | Espera hasta juntar tantas como el límite; ahí se aceptan todas, se cierra la búsqueda del perfil y se rechazan las demás |

Los datos de contacto de la persona quedan a disposición del colectivo recién
cuando la postulación es aceptada.

**Desanotar:** `POST .../colaboraciones/:colaboracionId/desvinculacion` pasa una
colaboración aceptada a `DESVINCULADA`. La usan tanto el colectivo como la
persona, y es permanente: queda en el historial y no se puede volver a postular
al mismo perfil. Otros perfiles se evalúan de forma independiente; una postulación
retirada permite volver a postularse.

Cerrar un proyecto (a mano, por fecha o porque el colectivo se dio de baja)
siempre tiene las mismas consecuencias: se rechazan las postulaciones pendientes
y terminan las colaboraciones en curso.

### Variables de entorno

| Variable                         | Obligatoria     | Qué hace                                                                                                                                                      |
| -------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MONGO_URI`                      | sí              | Conexión a MongoDB                                                                                                                                            |
| `SERVER_PORT`                    | no (8000)       | Puerto de la API                                                                                                                                              |
| `LOGTO_ENDPOINT`                 | para autenticar | Endpoint del tenant de Logto. La API valida los JWT (emisor `<endpoint>/oidc`, JWKS del tenant)                                                               |
| `LOGTO_API_RESOURCE`             | para autenticar | Identificador del API resource de Logto: es la audiencia que tiene que traer el token. Es el mismo valor que `VITE_LOGTO_API_RESOURCE` en el front            |
| `LOGTO_ALGORITMOS`               | no (`ES384`)    | Algoritmos de firma aceptados, separados por coma. Los que publica `<endpoint>/oidc/jwks`                                                                     |
| `AUTH_PROVEEDORES`               | no              | JSON con varios proveedores (reemplaza a las `LOGTO_*`). Ver `.env.example`                                                                                   |
| `AUTH_DESACTIVADA`               | no (`false`)    | Permite iniciar sin proveedor únicamente con `NODE_ENV=development` o `NODE_ENV=test`. Con `NODE_ENV=production`, `true` impide el arranque                   |
| `COMPAT_CONTEXTO_IMPLICITO`      | no              | Transitorio. `true` acepta pedidos sin `X-Context-Id` si el usuario tiene un único contexto válido y es el actual. Apagar cuando el front mande el encabezado |
| `CORS_ORIGENES`                  | no              | Orígenes del front, separados por coma. Sin esto se acepta cualquiera                                                                                         |
| `SMTP_URL`                       | no              | Servidor SMTP para mandar las notificaciones por email. Sin esto se simulan (quedan en el log)                                                                |
| `SMTP_REMITENTE`                 | no              | El "De:" de esos emails                                                                                                                                       |
| `LIMITE_SOLICITUDES_GENERAL`     | no (300)        | Solicitudes por IP cada 15 minutos                                                                                                                            |
| `LIMITE_SOLICITUDES_BUSQUEDAS`   | no (30)         | Solicitudes por IP por minuto en búsquedas y estadísticas                                                                                                     |
| `CIERRE_AUTOMATICO_INTERVALO_MS` | no (60000)      | Cada cuánto se buscan proyectos con la fecha de cierre vencida                                                                                                |
| `SEGUIMIENTO_INTERVALO_MS`       | no (3600000)    | Cada cuánto el job de seguimiento busca proyectos iniciados sin actualizaciones                                                                               |
| `DIAS_SIN_ACTUALIZACIONES`       | no (30)         | Días sin avances, logros ni aceptaciones para abrir una revisión                                                                                              |
| `MAX_DESTACADOS_ACTIVOS`         | no (6)          | Máximo de proyectos destacados vigentes a la vez                                                                                                              |
| `ENVIOS_INTERVALO_MS`            | no (15000)      | Frecuencia de generación de avisos y entrega de envíos pendientes                                                                                             |
| `APAGADO_PLAZO_MS`               | no (25000)      | Plazo máximo para terminar HTTP y jobs antes de cerrar MongoDB                                                                                                |
| `TRUST_PROXY`                    | no (false)      | IP o redes CIDR explícitas de proxies confiables, separadas por coma                                                                                          |

WhatsApp usa Twilio cuando están definidos `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
y `TWILIO_WHATSAPP_REMITENTE`; en otro caso se simula. Email usa `SMTP_URL` si
está configurado; SMS usa Twilio cuando también se define `TWILIO_SMS_REMITENTE`.
Sin ese remitente, SMS se simula. Un envío simulado termina en `SIMULADO` y
`exito: false`: no acredita entrega a un proveedor real.

Las cuentas **Trial** de Twilio rechazan SMS con texto propio (`Invalid template name.
Trial accounts can only use predefined SMS templates.`). Con `TWILIO_SMS_PLANTILLA`
(por ejemplo `sms_event_notifications`) el canal SMS envía esa plantilla predefinida
en lugar del texto de la notificación, y la API lo avisa al arrancar
(`sms_con_plantilla_de_twilio`). Al pasar la cuenta a paga se quita la variable.

WhatsApp tiene la misma restricción en Trial, pero la plantilla se identifica por su
`ContentSid` (`HX...`, el que muestra "Try out WhatsApp" en la consola):
`TWILIO_WHATSAPP_PLANTILLA` hace que se envíe esa plantilla en lugar del texto
(aviso `whatsapp_con_plantilla_de_twilio` al arrancar). En Trial el destinatario tiene
que estar verificado y unido al sandbox. Si WhatsApp usa otra cuenta de Twilio que SMS,
`TWILIO_WHATSAPP_ACCOUNT_SID` y `TWILIO_WHATSAPP_AUTH_TOKEN` reemplazan a las generales
solo para ese canal.

### Demostracion de notificaciones (solo desarrollo)

Desde la raiz, `npm run demo:notificaciones` crea un MongoDB temporal independiente
y recorre una invitacion usando los servicios reales: muestra las copias
`PENDIENTE` y luego `SIMULADO`, sin enviar mensajes. Requiere instalar tambien las
dependencias de desarrollo; la primera ejecucion descarga MongoDB.

Para enviar un email real con las credenciales de `packages/backend/.env`:

```sh
npm run demo:notificaciones -- --enviar --email destinatario@gmail.com
```

Para agregar SMS, sumar `--sms +5491155551234` con un destinatario habilitado por
Twilio. El numero `TWILIO_SMS_REMITENTE` es el remitente, no ese destinatario.
La cuenta trial puede restringir remitentes, destinos y contenido personalizado.
`ENVIADO` indica aceptacion del proveedor, no entrega final.

Si se configuran `DEMO_EMAIL_DESTINO` y `DEMO_SMS_DESTINO` en el `.env` local,
basta ejecutar `npm run demo:notificaciones -- --enviar`. Los destinos explicitos
en la linea de comandos reemplazan a los del archivo (para probar solo email,
usar unicamente `--email`). Estas variables no se usan en la API productiva.

Con una cuenta Twilio Trial, configurar `DEMO_SMS_PLANTILLA=sms_event_notifications`
permite enviar la plantilla de prueba de Twilio en lugar del texto de la invitacion,
solo dentro del comando de demo. El email y la notificacion interna conservan su
contenido normal. La API productiva nunca usa esa variable. Ver
[plantillas SMS de Trial](https://www.twilio.com/docs/usage/trials/try-out-sms).

La demo no usa `MONGO_URI`, no inicia la API, no se ejecuta en produccion y
elimina sus datos al terminar. Hace un intento por canal; si falla informa el
error y termina con codigo distinto de cero. La demo visual del frontend
(`npm run demo` en su repositorio) sigue funcionando sin backend ni envios reales.

### Manejo de errores

Los controllers **no tienen `try/catch`**. Cada capa lanza la excepción que le
corresponde y hay un solo lugar que la traduce a HTTP:

```
service / dominio          middlewares/manejadorErrores.js        respuesta
─────────────────────      ───────────────────────────────        ─────────
throw ZodError        ──▶  (validación de forma)             ──▶  400 + issues
id de la ruta que no es ObjectId (middlewares/validarIds.js) ──▶  400
throw BadRequestError ──▶  err.status                        ──▶  400
throw NotFoundError   ──▶  err.status                        ──▶  404
throw ConflictError   ──▶  err.status                        ──▶  409
throw DomainError     ──▶  err.status (regla de negocio)     ──▶  422
Mongoose ValidationError / CastError                         ──▶  400
Mongoose VersionError (otro pedido guardó antes)             ──▶  409
cualquier otra cosa   ──▶  registro.error + genérico         ──▶  500
```

El manejador se registra último en `app.js` y declara cuatro parámetros: así es
como Express reconoce un error handler y le entrega el error. Express 5 también
captura las promesas rechazadas, así que esto va a seguir funcionando cuando los
repositorios sean `async` contra MongoDB.

### Registro

Todo lo que escribe la API pasa por `src/config/registro.js`: una línea JSON por
evento, con `fecha`, `nivel` (`info`, `aviso` o `error`), `evento` y sus datos.
Cada pedido HTTP se registra al terminar (`pedido_http`, con `requestId`, método,
ruta, estado y milisegundos), salvo `/health` y `/ready`, y salvo en los tests.
Las rutas inexistentes pasan por el mismo manejador de errores que el resto.

### Forma de las respuestas

El resultado de la operación lo dice el código HTTP, no un campo del body.

| Caso                | Body                                                            |
| ------------------- | --------------------------------------------------------------- |
| Un recurso          | el objeto directo, sin envoltorio                               |
| Un listado paginado | `{ data: [...], meta: { page, per_page, total, total_pages } }` |
| Un error            | `{ message }`, más `issues` si es de validación                 |

> **Cambio respecto de la primera entrega.** Las respuestas ya no traen el campo
> `status`, y `PATCH /proyectos/:id` fue reemplazado por
> `POST /proyectos/:id/finalizacion`. Cualquier cliente que leyera
> `respuesta.data` para un recurso individual tiene que ajustarse.

## Autenticación con Logto

Logto registra, autentica y emite el access token. Al iniciar o restaurar la sesión, el frontend obtiene un token para el API resource y llama a `POST /auth/registro` con `Authorization: Bearer <token>`. La API vincula `proveedor` y `sub` con un usuario propio. Con el registro confirmado, el frontend consulta `GET /auth/me`, que es de solo lectura. Si falta el nombre, lo completa con `PUT /auth/usuario`. Luego puede crear o seleccionar un contexto y enviar `X-Context-Id` en las operaciones contextuales.

**Configuración en Logto**

1. Crear una aplicación **Single page app** para el front. Redirect URI: `<origen del front>/auth/callback` (por ejemplo `http://localhost:5173/auth/callback`). Post sign-out redirect URI: `<origen del front>/`. Hay que registrar un par por cada origen real (el puerto forma parte del origen).
2. Crear un **API resource** y copiar su identificador (por ejemplo `https://api.codigo-a-voluntad`). Ese valor va **igual** en `LOGTO_API_RESOURCE` del back y en `VITE_LOGTO_API_RESOURCE` del front: es la audiencia del token.
3. En el back, `LOGTO_ENDPOINT` es el endpoint del tenant (`https://<tenant>.logto.app`). El emisor se arma como `<endpoint>/oidc` y las claves salen de `<endpoint>/oidc/jwks`.

**Identidad, contexto y permisos**

- El modelo de seguridad conserva cada clase del diseño como una colección propia, relacionada por referencias `ObjectId`. Ninguna se embebe ni se reemplaza por un arreglo o un código de texto:

  | Clase del diseño          | Colección                     | Documento                                                                                             | Restricciones                                                                                        |
  | ------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
  | `Usuario`                 | `usuarios`                    | `_id`, `identidadExternaId` → `identidadesExternas`, `contextoActualId` → `contextosUsuario` o `null` | `identidadExternaId` obligatorio y único                                                             |
  | `IdentidadExterna`        | `identidadesExternas`         | `_id`, `proveedorId` → `proveedoresAutentificadores`, `identificadorExterno`                          | Único compuesto (`proveedorId`, `identificadorExterno`)                                              |
  | `ProveedorAutentificador` | `proveedoresAutentificadores` | `_id`, `proveedor`                                                                                    | `proveedor` obligatorio y único                                                                      |
  | `ContextoUsuario`         | `contextosUsuario`            | `_id`, `usuarioId`, `tipoContextoId`, `colectivoId` o `null`, `colaboradorId` o `null`, `rolId`       | Validador de la colección, membresía única, un perfil de colaboradora activo, un líder por colectivo |
  | `TipoContexto`            | `tiposContexto`               | `_id`, `nombre` (`COLABORADOR`, `COLECTIVO`)                                                          | `nombre` único                                                                                       |
  | `Rol`                     | `roles`                       | `_id`, `nombre` (`COLABORADOR`, `MIEMBRO`, `LIDER`, `ADMIN`)                                          | `nombre` único                                                                                       |
  | `Permiso`                 | `permisos`                    | `_id`, `nombre`                                                                                       | `nombre` único                                                                                       |
  | `RolXPermiso`             | `rolesXPermisos`              | `_id`, `rolId` → `roles`, `permisoId` → `permisos`                                                    | Único compuesto (`rolId`, `permisoId`)                                                               |

  `colectivos` y `colaboradores` (la colección física se llama `colaboradors`, el plural que arma Mongoose) siguen siendo las entidades a las que apunta `ContextoUsuario`. Además de los atributos del diseño, se conservan los que ya usaba la aplicación y no reemplazan ninguna relación: `Usuario.nombre`, `fechaAlta` y `versionContextos` (escritura de control de las transacciones); `ContextoUsuario.activo`, `fechaAlta` y `fechaBaja`; `IdentidadExterna.fechaAlta`; `Permiso.descripcion`; y `nombre`, `mecanismo` y `activo` del proveedor.

- MongoDB no tiene claves foráneas: la integridad referencial se valida en la capa de persistencia de `src/security` antes de escribir (el usuario, el colectivo o el colaborador de un contexto, la identidad de un usuario, el proveedor de una identidad, y que el contexto actual sea un contexto activo del propio usuario) y las escrituras relacionadas van en una transacción. Los validadores `$jsonSchema` de `usuarios`, `identidadesExternas`, `rolesXPermisos` y `contextosUsuario` rechazan en la base una referencia obligatoria ausente o que no sea un `ObjectId`.
- Cada `Usuario` nace con `nombre` nulo y `contextoActualId` nulo. Dos proveedores pueden emitir el mismo identificador externo (`sub`) sin compartir cuenta. Si una nueva cuenta de Logto tiene otro `sub`, su primer `POST /auth/registro` crea una identidad externa y un usuario interno distintos. El correo y el nombre que el proveedor incluya en sus claims se mantienen fuera del registro interno.
- `Usuario.nombre` se completa o cambia mediante `PUT /auth/usuario`. La API lo pide al crear un colectivo, crear un perfil de colaboradora o enviar una solicitud de ingreso (409 `NOMBRE_REQUERIDO`), y lo usa al listar miembros y solicitudes del colectivo. El perfil público de colaboradora mantiene su identificación propia.
- Un contexto activo `COLABORADOR` representa el único perfil activo de la persona. Un contexto activo `COLECTIVO` representa su membresía en ese colectivo como `MIEMBRO` o `LIDER`. El usuario puede tener varios colectivos o ninguno. Una cuenta puede tener a la vez su perfil de colaboradora y contextos de colectivo, de forma independiente: cada contexto es de un solo tipo, y cada pedido opera en el que indica `X-Context-Id`. Una cuenta no puede postularse a proyectos de un colectivo donde participa como `LIDER` o `MIEMBRO` (422 `POSTULACION_EN_COLECTIVO_PROPIO`). Si ya se había postulado y después entra al colectivo, la postulación sigue, pero desde un contexto de colectivo no puede aceptarla, rechazarla, finalizarla, desvincularla ni valorarla como colectivo (422 `COLABORACION_PROPIA`); como colaboradora sí.
- El seed toma los nombres y la matriz de `src/security/autorizacion/rolesYPermisos.js`, actualiza `tiposContexto`, `roles` y `permisos` por nombre y deja en `rolesXPermisos` exactamente un documento por cada permiso de cada rol (agrega los que faltan y quita los que sobran). La API arma su catálogo de autorización leyendo `roles`, `rolesXPermisos` y `permisos` al arrancar. Un cambio en código surte efecto al reiniciar la aplicación. Qué roles admite cada tipo de contexto es una regla de la aplicación (`ROLES_POR_TIPO`), no una relación entre `Rol` y `TipoContexto`. Los proveedores configurados se siembran por su código (campo `proveedor`) y conservan su indicador `activo` en MongoDB. Los repositorios traducen entre los nombres que usa el dominio (`LIDER`, `COLECTIVO`) y las referencias guardadas (`rolId`, `tipoContextoId`). Los miembros y el líder operan sobre proyectos y colaboraciones y consultan solicitudes y estadísticas. Solo el líder puede editar el colectivo y sus contactos, darlo de baja, aceptar o rechazar ingresos, quitar miembros y transferir el liderazgo. El listado de miembros está disponible para `MIEMBRO` y `LIDER` del colectivo seleccionado en su contexto actual. [Auditoría de autenticación y contextos](packages/backend/AUDITORIA-AUTH-CONTEXTOS.md)

**Flujo HTTP**

1. M1 (`src/security/http/autenticacion.js`) valida el Bearer. El registro de proveedores usa el emisor leído inicialmente para elegir adaptador. OIDC/JWT verifica firma con JWKS, algoritmo permitido, emisor, audiencia de la API, `sub`, `exp`, `iat`, `nbf` si está presente y los claims adicionales configurados. Un encabezado mal formado devuelve 401 `TOKEN_INVALIDO`. Si falla la disponibilidad de JWKS, devuelve 503 `PROVEEDOR_NO_DISPONIBLE`.
2. M2 (`identificacion.js`) recupera la identidad externa (por proveedor e identificador externo) y el usuario que la referencia. Si falta el registro en una ruta de usuario, devuelve 403 `USUARIO_NO_REGISTRADO`. `POST /auth/registro` requiere solo M1 y crea ambos documentos en una transacción. Las rutas de cuenta, alta de modalidad y solicitud propia usan M2 y pueden operar sin contexto.
3. M3 (`autorizarEnContexto.js`) protege las operaciones que se ejecutan en nombre de una colaboradora o colectivo. Valida que `X-Context-Id` sea del usuario, coincida con su contexto actual, esté activo, tenga una entidad asociada activa y posea el permiso de la ruta. Los guards de recurso verifican que el ID de negocio corresponda al contexto. Según el caso, la API responde `CONTEXTO_REQUERIDO` (400), `CONTEXTO_INVALIDO` (403), `CONTEXTO_NO_ACTUAL` (409), `CONTEXTO_INACTIVO` (403) o `PERMISO_INSUFICIENTE` (403).

`Usuario.contextoActualId` es global. Elegir otro contexto afecta las demás ventanas y dispositivos. Un cliente con un contexto anterior puede actualizar su vista con `GET /auth/me`. El logout intenta limpiarlo con `DELETE /auth/contexto-actual`. Si la API está indisponible, la limpieza queda sin confirmar.

La compatibilidad transitoria `COMPAT_CONTEXTO_IMPLICITO=true` acepta la ausencia del header solo cuando hay exactamente un contexto válido y coincide con el persistido. La respuesta indica `Deprecation: true`. La opción está desactivada por defecto y se limita a la resolución del contexto.

| Endpoint                                                                      | Para qué                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /auth/registro`                                                         | Alta o recuperación idempotente del usuario del token. Se llama antes de consultar la cuenta                                                                                                               |
| `PUT /auth/usuario`                                                           | Completar o cambiar el nombre (dato propio de la app)                                                                                                                                                      |
| `GET /auth/me`                                                                | Consulta de solo lectura del usuario, nombre, contexto actual y contextos con sus permisos. Conserva el `id` legado del token y `rol` y `perfilId` del contexto actual. El ID interno está en `usuario.id` |
| `PUT` / `DELETE /auth/contexto-actual`                                        | Elegir el contexto / dejarlo en `null` al cerrar sesión                                                                                                                                                    |
| `POST /colectivos/:id/solicitudes-ingreso` y `.../cancelacion`                | Pedir el ingreso / cancelarlo                                                                                                                                                                              |
| `GET /colectivos/:id/solicitudes-ingreso`                                     | Bandeja consultable por miembros y líder                                                                                                                                                                   |
| `POST .../aceptacion`, `POST .../rechazo`                                     | Resolución de solicitudes por el líder                                                                                                                                                                     |
| `GET /colectivos/:id/miembros`, `DELETE /colectivos/:id/miembros/:contextoId` | Miembros / quitar uno                                                                                                                                                                                      |
| `POST /colectivos/:id/abandono`, `POST /colectivos/:id/lider`                 | Irse / pasar el liderazgo                                                                                                                                                                                  |
| `POST /colectivos/:id/baja`                                                   | Baja lógica del colectivo del contexto actual del líder. Disponible con autenticación activa                                                                                                               |
| `POST /colaboradores/:id/baja`                                                | Baja lógica del perfil de colaboradora                                                                                                                                                                     |

**Proveedores y arranque**

`AUTH_PROVEEDORES` acepta un arreglo JSON de proveedores con `codigo`, `mecanismo`, `issuers`, `audiencia`, `jwksUri` y `algoritmos`. Para `OIDC_JWT` se pueden configurar `tipo` del encabezado JWT, `claimsObligatorios`, `toleranciaReloj` y `cooldownJwksMs`. La audiencia se configura con el identificador de la API. Los emisores y JWKS usan HTTPS en producción. Códigos o emisores repetidos, algoritmos fuera de la lista asimétrica y una lista sin proveedores habilitados impiden el arranque con autenticación. Un proveedor compatible con OIDC/JWT se configura sin modificar el negocio. Un protocolo distinto requiere un adaptador y su mecanismo de selección en `src/security/auth`.

Al arrancar, la API comprueba que MongoDB soporte transacciones y que la base no tenga documentos del modelo de seguridad anterior, asegura los índices declarados mediante `createIndexes()`, siembra los catálogos de seguridad, instala o actualiza los validadores de `usuarios`, `identidadesExternas`, `rolesXPermisos` y `contextosUsuario`, crea el índice único del líder activo (que referencia al rol `LIDER` sembrado) y siembra las habilidades. El modelo no migra datos de la versión anterior: si la base los tiene, el arranque se detiene con un mensaje que pide recrearla (`docker compose down -v && docker compose up -d`). Un error de persistencia en esas operaciones detiene el inicio. La cuenta de MongoDB necesita permisos para crear índices y colecciones y ejecutar `collMod` en la colección de contextos existente. El arranque ejecuta las migraciones 002 de proyectos y colaboraciones, 003 de envíos y 004 de unicidad del perfil activo. En bases que ya tienen el índice anterior, la 004 instala el índice nuevo antes de retirar el anterior y conserva los documentos.

El validador exige ambos campos de asociación en un contexto. Según el tipo, uno es ObjectId y el otro es explícitamente nulo. Los índices únicos cubren la identidad externa, el perfil activo por usuario, la membresía por usuario y colectivo, el líder activo y la solicitud pendiente. Las referencias entre documentos y el límite de un perfil de colaboradora activo por cuenta se coordinan en transacciones. Las altas, la aceptación de ingresos y las postulaciones comparten una escritura de control sobre el usuario: evita el alta doble de un perfil y ordena una aceptación contra una postulación simultánea a un proyecto del mismo colectivo. La publicación y las solicitudes de ingreso comparten una escritura de control sobre el colectivo con su baja. Una escritura de control sobre el perfil coordina la baja de colaboradora con nuevas postulaciones.

Las operaciones reservadas al líder confirman el contexto actual dentro de su transacción. El cambio de contexto, el logout y la escritura privilegiada se ordenan mediante el documento del usuario. La baja de colectivo confirma en conjunto colectivo, cierre de proyectos y colaboraciones, solicitudes pendientes, membresías, contextos actuales y notificaciones encoladas. El job de envíos despacha después del commit. La baja de colaboradora es definitiva para ese perfil y conserva su historial. Se rechaza con `ACTIVIDAD_EN_CURSO` mientras haya postulaciones pendientes o colaboraciones aceptadas. Para volver, la misma cuenta usa `POST /colaboradores`. La API crea un perfil y un contexto distintos y selecciona ese contexto. Los perfiles y contextos anteriores conservan sus IDs y su historial.

El replica set de un solo nodo de Docker habilita transacciones en desarrollo y en el despliegue actual. Un solo nodo tiene un único punto de falla.

**Prueba de punta a punta con un tenant real**

1. Iniciar el back con las dos variables y el front con `VITE_LOGTO_ENDPOINT`, `VITE_LOGTO_APP_ID` y `VITE_LOGTO_API_RESOURCE`.
2. Enviar el access token a `POST /auth/registro` y luego a `GET /auth/me`. Una cuenta recién registrada recibe 200 con `usuario.nombre: null` y `contextoActual: null`. Un token ausente o vencido recibe 401.
3. Recorrer en el front: registro, alta del perfil, recarga de la página, cierre de sesión y vencimiento del token (esperar a que expire o acortar su vida en Logto).

## Administración de la plataforma

Hay un tercer tipo de contexto, `ADMINISTRACION`, con el rol `ADMIN`. No apunta a un
colectivo ni a una colaboradora, y una cuenta puede tenerlo junto con los otros dos:
cada pedido opera solo con el contexto que indica `X-Context-Id`. El rol no se pide
desde la aplicación: el primer administrador se crea con el comando

```bash
npm run admin:otorgar -- <usuarioId | proveedor:sub>
```

(la cuenta tiene que haberse registrado antes con `POST /auth/registro`) y los siguientes los
otorga un administrador con `POST /administracion/administradores`.

| Ruta                                                     | Permiso             | Qué hace                                                         |
| -------------------------------------------------------- | ------------------- | ---------------------------------------------------------------- |
| `GET /administracion/auditoria`                          | `AUDITORIA_VER`     | Acciones administrativas, filtrables por acción, entidad y fecha |
| `GET /administracion/revisiones`                         | `REVISION_VER`      | Cola de revisiones, filtrable por estado y motivo                |
| `POST /administracion/revisiones/:id/resolucion`         | `REVISION_RESOLVER` | Pasa una revisión a `REVISADA` o `DESCARTADA`                    |
| `PUT` / `DELETE /administracion/proyectos/:id/destacado` | `PROYECTO_DESTACAR` | Destaca un proyecto hasta una fecha futura, o lo quita           |
| `POST /administracion/administradores`                   | `ADMIN_GESTIONAR`   | Otorga el rol a otra cuenta                                      |

- **Auditoría.** Toda acción administrativa que cambia datos escribe su registro en la misma
  transacción: sin registro, no hay cambio. Las altas hechas por el comando quedan sin autor y
  con `origen: COMANDO`.
- **Destacados.** Solo proyectos abiertos de un colectivo activo, con vencimiento futuro y un
  máximo de `MAX_DESTACADOS_ACTIVOS` vigentes. El vencimiento se resuelve al consultar, sin job.
  Los listados públicos ordenan primero los vigentes; `GET /proyectos/destacados` los devuelve
  con el que menos tiempo lleva destacado primero.
- **Revisiones.** Un job crea una revisión `SIN_ACTUALIZACIONES` para cada proyecto abierto con
  al menos una colaboración aceptada y sin avances, logros ni aceptaciones en
  `DIAS_SIN_ACTUALIZACIONES` días. Es idempotente (índice único parcial sobre las pendientes)
  y no avisa a nadie: los administradores la ven en el listado. Una revisión resuelta no se
  vuelve a crear hasta que pase otro período completo.
- **Conflicto de intereses.** Un administrador que además es líder o miembro de un colectivo
  no puede destacar, quitar el destacado ni resolver revisiones de los proyectos de ese
  colectivo (422 `CONFLICTO_DE_INTERESES`).

La spec completa está en [docs/administracion-de-plataforma.md](docs/administracion-de-plataforma.md).

## Puesta en marcha

### Con Docker (recomendado)

Levanta la API y MongoDB juntos. Solo hace falta Docker Desktop.

```bash
docker compose up -d --build     # construye la imagen y levanta api + mongo
docker compose logs -f api       # ver los logs de la api (Ctrl+C para salir)
```

Verificación: `curl http://localhost:8000/health`

| Comando                                               | Qué hace                                                          |
| ----------------------------------------------------- | ----------------------------------------------------------------- |
| `docker compose up -d --build`                        | Levanta todo. **Usar `--build` después de cada cambio de código** |
| `docker compose ps`                                   | Estado de los contenedores                                        |
| `docker compose logs -f api`                          | Logs de la api en vivo                                            |
| `docker compose restart api`                          | Reinicia solo la api                                              |
| `docker compose down`                                 | Baja los contenedores. **Los datos se conservan**                 |
| `docker compose down -v`                              | Baja todo **y borra la base** (el volumen `mongo-data`)           |
| `docker exec -it cav-mongo mongosh codigo-a-voluntad` | Consola de Mongo                                                  |

> **Ojo con el `--build`.** El `Dockerfile` copia el código **adentro de la
> imagen** al construirla. Si editás un archivo y hacés solo `docker compose up`
> o `restart`, el contenedor sigue corriendo el código viejo.

En desarrollo, Mongo publica el puerto 27017 para poder conectarse con Compass
(`mongodb://localhost:27017`).

### Sin Docker

Necesitás un MongoDB corriendo en `localhost:27017` **como replica set** (hace
falta para las transacciones). El de Docker ya lo es: `docker compose up -d mongo`.
Desde fuera de Docker se conecta con `?directConnection=true` (ver `.env.example`).

```bash
npm install                                        # instala todos los workspaces
cp packages/backend/.env.example packages/backend/.env
npm run dev:backend                                # con recarga automática
```

El `.env` tiene que tener `MONGO_URI`; si falta, el backend no arranca. El puerto
sale de `SERVER_PORT` (default 8000) y el backend escucha en `0.0.0.0`. Al
arrancar carga el catálogo de habilidades semilla si la colección está vacía,
asegura los catálogos de seguridad (tipos de contexto, roles, permisos,
`rolesXPermisos` y proveedores), instala los validadores de las colecciones de
seguridad y corre las migraciones pendientes.

## Scripts

| Comando                                                 | Qué hace                                                                 |
| ------------------------------------------------------- | ------------------------------------------------------------------------ |
| `npm run dev:backend`                                   | Backend con recarga automática (`node --watch`)                          |
| `npm run start:backend`                                 | Backend sin recarga (es el que corre dentro del contenedor)              |
| `npm test`                                              | Todos los tests (Jest, contra un MongoDB que levanta solo)               |
| `npm run test:integracion`                              | Solo los de `tests/integracion`                                          |
| `npm run lint`                                          | ESLint sobre todo el repo                                                |
| `npm run admin:otorgar -- <usuarioId \| proveedor:sub>` | Otorga el rol de administración a una cuenta ya registrada (idempotente) |
| `npm run format`                                        | Prettier sobre todo el repo                                              |

## Tests

Todos los tests corren contra **MongoDB de verdad** (lineamiento 8 del TP: sin
mocking de la base). `mongodb-memory-server` levanta una instancia (replica set
de un nodo, porque la API usa transacciones) al principio de la corrida, y cada
worker de Jest usa su propia base, que se vacía antes de cada test. No hace
falta tener Mongo ni Docker levantados: la primera vez se descarga el binario
de MongoDB (queda en caché).

Para usar un Mongo ya levantado (por ejemplo el de `docker compose up -d mongo`):
`MONGO_URI_TEST=mongodb://127.0.0.1:27017/?replicaSet=rs0 npm test`.

| Carpeta                             | Qué prueba                                                                             |
| ----------------------------------- | -------------------------------------------------------------------------------------- |
| `tests/domain`                      | Entidades                                                                              |
| `tests/services`                    | Casos de uso, sobre los repositorios de Mongo                                          |
| `tests/http`                        | Rutas y middlewares de la app Express entera, con supertest                            |
| `tests/middlewares`, `tests/models` | Sanitización y formato JSON                                                            |
| `tests/integracion`                 | Lo propio de la base: índices, transacciones, concurrencia, agregaciones y migraciones |

```bash
npm test                                     # todo
npm run test:integracion                     # solo tests/integracion
npm test --workspace=backend -- --watch      # en watch
```

| Archivo de integración               | Qué prueba                                                                                                                                            |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `administracionConcurrencia.test.js` | Tope de destacados con pedidos simultáneos, rollback de la auditoría e índice parcial de revisiones                                                   |
| `contextoAdministracion.test.js`     | Validador `$jsonSchema` e índice único del contexto de administración                                                                                 |
| `persistencia.test.js`               | Cada entidad vuelve de la base con **todos** sus campos (Mongoose descarta en silencio lo que no está en el schema)                                   |
| `busquedas.test.js`                  | Las búsquedas de colaboradoras y proyectos potenciales, contra las reglas de `reglasDeBusqueda.js`                                                    |
| `estadisticas.test.js`               | Los pipelines de estadísticas                                                                                                                         |
| `concurrencia.test.js`               | Concurrencia optimista por proyecto: dos aceptaciones simultáneas no superan el cupo; editar un proyecto no choca con postularse a otro               |
| `migracionProyectos.test.js`         | Migraciones 002 (proyectos y colaboraciones a sus colecciones) y 003 (envíos con estado)                                                              |
| `api.test.js`                        | La app Express entera contra Mongo (test de integración de controladores)                                                                             |
| `contextosYTransacciones.test.js`    | Rollback de un alta que falla, índices únicos de contextos, validador `$jsonSchema`, transferencia de liderazgo concurrente y la migración de cuentas |

## Despliegue

VM en Oracle Cloud, región San Pablo (la más cercana): Ubuntu 20.04, 1 GB de
RAM + 2 GB de swap, con Docker y Docker Compose instalados. Todo corre en
contenedores con `docker-compose.prod.yml`: MongoDB, la API y, desde la tercera
entrega, el front servido por Caddy (ver "Tercera entrega: front y HTTPS").

```
https://<DOMINIO>/                 front
https://<DOMINIO>/api/health       API a través de Caddy
http://147.15.102.156:8000/docs    Swagger (puerto directo de la API)
```

La IP es de Oracle y puede cambiar si se recrea la instancia; conviene
reservarla desde la consola. Para verificar la actual, desde la VM:
`curl -s ifconfig.me`.

### Conectarse a la VM

| Dato             | Valor                                                     |
| ---------------- | --------------------------------------------------------- |
| Instancia        | `instance-20260907-2051` (Oracle Cloud, región São Paulo) |
| IP pública       | `147.15.102.156`                                          |
| Usuario          | `ubuntu` (el que traen las imágenes Ubuntu de Oracle)     |
| Proyecto         | `~/tp-desarrollo-2c-2026`, en la rama `main`              |
| Cuenta de Oracle | La de Lucio (creador de la instancia y de la consola web) |

Se entra por SSH con un **archivo de clave privada**, no con contraseña. La VM
acepta las claves públicas que estén en `~/.ssh/authorized_keys`, una por
línea. Cada integrante tiene la suya:

| Clave (comentario al final de la línea) | De quién                                      |
| --------------------------------------- | --------------------------------------------- |
| `ssh-key-2026-09-07`                    | Lucio: la generó Oracle al crear la instancia |
| `mate-tp-dds`                           | Mateo                                         |

```powershell
# Con la clave por defecto (~/.ssh/id_ed25519), SSH la encuentra solo:
ssh ubuntu@147.15.102.156

# Con un archivo de clave en otro lugar (por ejemplo, la que bajó Oracle):
ssh -i "C:\Users\<usuario>\Downloads\ssh-key-2026-09-07.key" ubuntu@147.15.102.156
```

La primera vez pregunta `Are you sure you want to continue connecting?`:
responder `yes`. Para salir de la VM: `exit`.

**Atajo (opcional).** Con esto en `~/.ssh/config`, alcanza con `ssh cav-vm`:

```
Host cav-vm
  HostName 147.15.102.156
  User ubuntu
  IdentityFile ~/.ssh/id_ed25519
```

**Sumar a alguien del grupo.**

1. En su compu genera su par de claves (la privada no sale nunca de ahí):

   ```powershell
   ssh-keygen -t ed25519 -C "nombre-tp-dds"
   Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub"   # una sola línea: ssh-ed25519 AAAA... nombre-tp-dds
   ```

2. Le pasa esa línea (la **pública**: se puede mandar por chat) a alguien que
   ya tenga acceso, y esa persona la agrega desde la VM. Con `>>`, no `>`: uno
   solo borraría las claves que ya están.

   ```bash
   echo "ssh-ed25519 AAAA... nombre-tp-dds" >> ~/.ssh/authorized_keys
   ```

3. La persona nueva prueba entrar **antes** de que la otra cierre su sesión.

**Problemas comunes.**

| Mensaje                         | Causa                                                               | Solución                                                                                   |
| ------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `Permission denied (publickey)` | Esa clave no está en `authorized_keys`, o el usuario no es `ubuntu` | Revisar el usuario; que alguien con acceso agregue la clave pública                        |
| `UNPROTECTED PRIVATE KEY FILE`  | Windows le dio permisos de más al archivo de clave                  | `icacls "<archivo>" /inheritance:r` y `icacls "<archivo>" /grant:r "$($env:USERNAME):(R)"` |
| `Connection timed out`          | La VM está apagada o cambió la IP                                   | Consola de Oracle → Compute → Instances                                                    |

> Si se pierden **todas** las claves privadas no hay forma de entrar por SSH:
> habría que recrear la instancia cargando claves nuevas. Por eso cada
> integrante tiene la suya, y la cuenta de Oracle debería tener más de un
> usuario administrador.

### Qué cambia respecto de desarrollo

`docker-compose.prod.yml` es un archivo aparte, no un agregado al de desarrollo:

- **Mongo no publica ningún puerto.** La API le habla por la red interna de
  Compose (el host `mongo`). Ver "Puertos" más abajo.
- **Mongo tiene usuario y contraseña**, que se leen del archivo `.env` de la raíz
  del repo (no se commitea; la plantilla es `.env.prod.example`).
- **Límites de memoria**, uno por proceso (ver "Memoria" más abajo).
- La API espera a que Mongo esté sano (healthcheck) antes de arrancar. "Sano"
  quiere decir PRIMARY del replica set.
- **Mongo es un replica set de un nodo**, con `keyFile` (obligatorio cuando hay
  usuario y contraseña). No agrega tolerancia a fallas: está para habilitar las
  transacciones. Ver "Replica set" más abajo.
- `restart: unless-stopped`: Docker levanta los contenedores solo después de un
  reinicio de la VM. Reemplaza a PM2, que es lo que mantenía viva la API en la
  primera entrega.

### Primer despliegue

Desde la VM, por SSH:

```bash
# 1. Apagar el backend viejo (si no, ocupa el puerto 8000).
#    En la VM de Oracle corre con PM2, bajo el nombre "backend-cav":
pm2 list                      # confirmar el nombre
pm2 stop backend-cav
pm2 delete backend-cav
pm2 save                      # guarda la lista vacia: asi no revive al reiniciar la VM

# 2. Traer el código. La VM está parada en la rama main: primero hay que
#    mergear develop en main con un PR (como el #16 de la primera entrega),
#    si no, el pull no trae nada de Docker.
cd ~/tp-desarrollo-2c-2026
git status                    # tiene que decir "On branch main" y estar limpio
git pull

# 3. Credenciales de Mongo (una sola vez)
cp .env.prod.example .env
openssl rand -hex 24          # copiar la salida como MONGO_PASSWORD
nano .env
chmod 600 .env

# 3b. keyFile del replica set (una sola vez; queda fuera de git)
mkdir -p secrets
openssl rand -base64 756 > secrets/mongo-keyfile
chmod 400 secrets/mongo-keyfile
sudo chown 999:999 secrets/mongo-keyfile   # 999 = usuario mongodb de la imagen

# 4. Levantar
docker compose -f docker-compose.prod.yml up -d --build

# 5. Verificar
docker compose -f docker-compose.prod.yml ps     # mongo tiene que decir (healthy)
curl http://localhost:8000/health
```

El usuario de Mongo se crea **solo la primera vez**, cuando el volumen está
vacío. Si después cambiás la contraseña en `.env`, Mongo sigue con la vieja y la
API no se puede conectar. En ese caso, hay que borrar el volumen (y con él los
datos) con `docker compose -f docker-compose.prod.yml down -v`, o cambiar la
contraseña desde `mongosh`.

### Tercera entrega: front y HTTPS

```
navegador ──https──▶ VM :443 ──▶ cav-web (Caddy)
                                   ├─ /        → build de React (/srv)
                                   └─ /api/*   → cav-api :8000 ──▶ cav-mongo
```

El servicio `web` se construye desde el repo del front
([codigo-a-voluntad-front](https://github.com/Mazzini123/codigo-a-voluntad-front)),
clonado al lado de este en la VM. Su imagen compila el front con Node y lo
sirve con Caddy (ver la sección "Despliegue" de su README).

**Por qué HTTPS.** El SDK de Logto usa `crypto.subtle` del navegador para el
login, y el navegador solo lo habilita en HTTPS o en `localhost`. Entrando por
`http://<IP>` el ingreso no funciona. Un certificado necesita un nombre de
dominio: se usa un subdominio gratuito de [DuckDNS](https://www.duckdns.org).

**Por qué Caddy.** Cumple el mismo rol que NGINX, que el enunciado menciona
como opcional: proxy reverso delante de la API y servidor del bundle del
cliente. Además obtiene y renueva solo el certificado de Let's Encrypt; con
NGINX haría falta certbot aparte.

**Variables nuevas en `.env`** (además de las de Mongo):

| Variable             | Para qué                                                                 |
| -------------------- | ------------------------------------------------------------------------ |
| `DOMINIO`            | Subdominio de DuckDNS, sin `https://`. Caddy saca el certificado para él |
| `CORS_ORIGENES`      | `https://` + `DOMINIO`                                                   |
| `LOGTO_ENDPOINT`     | Endpoint del tenant. Lo usan la API y el front                           |
| `LOGTO_API_RESOURCE` | Identificador del API resource. Lo usan la API (audiencia) y el front    |
| `LOGTO_APP_ID`       | App ID de la aplicación "Single page app" del front en Logto             |

Las de Logto se escriben en el JavaScript del front al compilar: si cambian,
hay que reconstruir con `--build`.

**Preparación (una sola vez).**

1. **DuckDNS:** iniciar sesión en duckdns.org, crear el subdominio y cargarle
   la IP pública de la VM.
2. **Oracle** (consola → Networking → VCN → Security List): reglas de entrada
   TCP 80 y 443 desde `0.0.0.0/0`. El 80 hace falta para que Let's Encrypt
   valide el dominio y para redirigir a HTTPS.
3. **Logto** (aplicación "Single page app" del front): agregar la Redirect URI
   `https://<DOMINIO>/auth/callback` y la Post sign-out redirect URI
   `https://<DOMINIO>/`, y copiar su App ID.

**Despliegue en la VM.**

```bash
# 1. Clonar el front al lado del back (una sola vez)
cd ~
git clone https://github.com/Mazzini123/codigo-a-voluntad-front.git

# 2. Traer los cambios del back (la VM está en main)
cd ~/tp-desarrollo-2c-2026
git pull

# 3. Completar las variables nuevas
nano .env

# 4. (Opcional) Validar el Caddyfile antes de construir
docker run --rm -v ~/codigo-a-voluntad-front/Caddyfile:/etc/caddy/Caddyfile:ro \
  -e DOMINIO=ejemplo.duckdns.org caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile

# 5. Construir y levantar
docker compose -f docker-compose.prod.yml up -d --build

# 6. Ver cómo Caddy saca el certificado
docker compose -f docker-compose.prod.yml logs -f web   # Ctrl+C para salir
```

Verificar desde el navegador: `https://<DOMINIO>/` abre la landing, recargar
una ruta interna (por ejemplo `/proyectos`) no da 404,
`https://<DOMINIO>/api/health` responde y el ingreso con Logto vuelve a la app.

| Problema                                          | Causa probable                                              | Solución                                                                           |
| ------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Caddy no obtiene el certificado                   | El dominio no apunta a la VM o el 80 está cerrado en Oracle | `ping <DOMINIO>` debe dar la IP de la VM; revisar la Security List                 |
| El build del front se corta por memoria           | 1 GB de RAM con Mongo y la API corriendo                    | `docker compose -f docker-compose.prod.yml stop api`, volver a `up -d --build`     |
| Logto dice que la redirect URI no es válida       | Falta cargar la URI de producción en Logto                  | Paso 3 de la preparación, con `https://` y sin barra extra                         |
| El front carga pero las llamadas fallan por CORS  | `CORS_ORIGENES` no coincide con el origen del front         | `CORS_ORIGENES=https://<DOMINIO>` y `docker compose ... up -d` para recrear la API |
| Cambié una variable de Logto y el front no cambia | Las `VITE_*` se fijan al compilar                           | `docker compose -f docker-compose.prod.yml up -d --build`                          |

### Puertos

Para que un puerto de un contenedor llegue a internet hacen falta tres cosas:

```
contenedor ──"ports" del compose──▶ VM ──firewall de la VM──▶ Security List de Oracle ──▶ internet
```

| Pieza                | Dónde                   | Qué hace                                                                       |
| -------------------- | ----------------------- | ------------------------------------------------------------------------------ |
| `EXPOSE 8000`        | `Dockerfile`            | Nada en la red: documenta en qué puerto escucha la app                         |
| `ports: "8000:8000"` | compose                 | Enlaza `puerto_de_la_VM:puerto_del_contenedor` (podría ser `"9000:8000"`)      |
| Firewall de Ubuntu   | la VM                   | Filtro de la máquina. Ojo: los puertos que publica Docker se lo saltean        |
| Security List        | consola de Oracle → VCN | El firewall de la nube: sin una regla de entrada para el puerto, no llega nada |

El 8000 de la API está abierto en la Security List (por eso se llega desde el
navegador). El 80 y el 443 los publica el servicio `web` (Caddy) y también
tienen que estar abiertos en la Security List. Para exponer Mongo habría que publicar el 27017 **y** abrirlo en
Oracle; como no se publica, aunque se abriera en Oracle por error no habría
nada escuchando.

### Memoria

Son dos límites distintos, y cada uno limita a un proceso:

| Configuración                           | Limita a        | Qué es                                                                                    |
| --------------------------------------- | --------------- | ----------------------------------------------------------------------------------------- |
| `--wiredTigerCacheSizeGB 0.25`          | Mongo           | La caché de su motor de almacenamiento. El proceso entero usa algo más                    |
| `NODE_OPTIONS=--max-old-space-size=256` | La API          | El heap de V8, en MB. Node usa más que eso en total (~350-400 MB)                         |
| `mem_limit`                             | Cada contenedor | Techo duro (cgroups de Linux): si se pasa, el kernel mata el proceso y Docker lo reinicia |

El consumo real se mira con `docker stats --no-stream`.

### Replica set

El healthcheck de Mongo inicia el replica set la primera vez (`rs.initiate` con
el host `mongo:27017`) y después solo confirma que el nodo es PRIMARY. La
configuración queda en el volumen y sobrevive a reinicios.

**Pasar una VM que ya tenía datos** (una sola vez):

1. Backup (ver "Dónde están los datos y cómo hacer backup").
2. Crear el `keyFile` (paso 3b de "Primer despliegue").
3. `git pull` y `docker compose -f docker-compose.prod.yml up -d --build`. Los
   datos no se migran: el mismo volumen pasa a ser un replica set.
4. Al arrancar, la API corre la migración de cuentas a contextos (ver
   "Autenticación con Logto") y deja el informe en el log.

Volver atrás es sacar `--replSet` y `--keyFile` del `command`: los datos no cambian.

| Situación                                     | Qué hacer                                                                                                        |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Compass o `mongosh` desde la PC por túnel SSH | Agregar `directConnection=true` a la URI: el nodo se anuncia como `mongo:27017`, que fuera de Docker no resuelve |
| Se perdió el `keyFile`                        | Generar otro y reiniciar Mongo                                                                                   |
| Se renombró el servicio `mongo`               | `rs.reconfig` con el host nuevo                                                                                  |

El oplog ocupa 512 MB fijos (`--oplogSize`). Conviene volver a medir con
`docker stats` contra el límite de memoria del contenedor.

### Actualizar después de un cambio

```bash
cd ~/codigo-a-voluntad-front && git pull   # si cambió el front
cd ~/tp-desarrollo-2c-2026 && git pull
docker compose -f docker-compose.prod.yml up -d --build
docker image prune -f        # borra las imágenes viejas (el disco es chico)
```

> **Al desplegar las correcciones de la segunda entrega** (`_id` autogenerado,
> habilidades copiadas en vez de referenciadas) los datos viejos dejan de ser
> compatibles. Antes de levantar, hacer un backup (ver abajo) y vaciar la
> base: `docker compose -f docker-compose.prod.yml down -v`. Al arrancar, la
> API vuelve a sembrar el catálogo de habilidades.

### Operación

| Comando                                                                                              | Qué hace                              |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `docker compose -f docker-compose.prod.yml ps`                                                       | Estado                                |
| `docker compose -f docker-compose.prod.yml logs -f api`                                              | Logs de la api                        |
| `docker compose -f docker-compose.prod.yml logs -f web`                                              | Logs de Caddy (certificado, pedidos)  |
| `docker compose -f docker-compose.prod.yml restart api`                                              | Reiniciar la api                      |
| `docker stats --no-stream`                                                                           | Consumo de memoria de cada contenedor |
| `docker exec -it cav-mongo mongosh -u <usuario> -p --authenticationDatabase admin codigo-a-voluntad` | Consola de Mongo (pide la contraseña) |

### Dónde están los datos y cómo hacer backup

`mongo-data` es un **volumen con nombre**: Docker lo guarda en su propia
carpeta de la VM, no en la del proyecto. Es como un pendrive que se monta en
`/data/db` del contenedor: si el contenedor muere, la carpeta sigue en la VM.

```bash
docker volume ls                                   # el nombre lleva el prefijo del proyecto
docker volume inspect <nombre> --format '{{ .Mountpoint }}'
# → /var/lib/docker/volumes/<proyecto>_mongo-data/_data
```

Para un backup no se copian esos archivos con Mongo andando: se usa
`mongodump`, que saca una copia consistente.

```bash
# Backup (queda en la carpeta actual de la VM)
docker exec cav-mongo sh -c 'mongodump -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db codigo-a-voluntad --archive --gzip' > backup-$(date +%F).gz

# Restaurar
docker exec -i cav-mongo sh -c 'mongorestore -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --archive --gzip' < backup-AAAA-MM-DD.gz
```

## Git Flow

Ramas permanentes:

- `main` — solo código funcionando. Cada entrega se taggea (`v1.0-entrega1`).
- `develop` — integración del trabajo del equipo.

Ramas temporales, salen de `develop` y vuelven a `develop` vía Pull Request:

- `feature/<nombre>` — nueva funcionalidad. Ej: `feature/dominio-colectivo`
- `fix/<nombre>` — corrección de un bug

Ciclo de trabajo:

```bash
git checkout develop && git pull
git checkout -b feature/mi-funcionalidad
# trabajar, commitear
git pull origin develop        # resolver conflictos acá, no en el PR
git push -u origin feature/mi-funcionalidad
```

Reglas del equipo:

1. Nadie commitea directo a `main` ni a `develop`.
2. Todo PR lo revisa al menos otra persona del grupo antes de mergear.
3. Antes de abrir el PR, actualizar la rama contra `develop`.

## Equipo

- Mateo Iglesias
- Lucio Mazzini
- Facundo Teran
- Matias Trejo
- Tiago Beltran

## Revisión integral de noviembre de 2026

Ver [cambios, contratos HTTP y operación](packages/backend/REVISION-IMPLEMENTADA.md) y
[contrato de repositorios](packages/backend/CONTRATO-REPOSITORIOS.md). Los listados usan
resúmenes y los historiales se consultan por páginas. La rama correspondiente del
frontend incorpora navegación, conteos globales y carga de páginas adicionales.

## Estilo de código

El equipo usa el mismo formato en backend y frontend. Las reglas, la configuración
del editor y los comandos de verificación están en [ESTILO.md](ESTILO.md).

La [guía de simplificación](packages/backend/SIMPLIFICACION.md) explica las decisiones
para el TP: apagado directo, un único generador de avisos y respuestas de lectura explícitas.
