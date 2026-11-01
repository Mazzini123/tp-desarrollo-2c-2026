# Código a Voluntad — TP Integrador DDS 2C 2026

Plataforma que conecta colectivos (fundaciones, ONGs, asambleas, organizaciones
territoriales) con personas colaboradoras del ámbito del desarrollo de software.

## Documentación

**API REST:** generada con Swagger a partir de la especificación OpenAPI del
repositorio. Con el backend levantado:

- UI navegable y probable: <http://localhost:8000/docs>
- Especificación cruda: <http://localhost:8000/openapi.json>
- Fuente: `packages/backend/src/docs/openapi.js`

**Diagrama de clases:** `diagrama_clases/diagrama_clases.puml` (PlantUML) y su
render en `diagrama_clases/diagrama_clases.png`.

**Documentación arquitectónica:**
[Google Drive](https://drive.google.com/drive/folders/1bh2M-NIkymUHaHRwEcv2dzRxbNwmOpFu)

## Estructura

Monorepo con npm workspaces:

```
packages/
├── backend/     Node.js + Express (API JSON)
└── frontend/    React (a partir de la tercera entrega)
```

El backend sigue una arquitectura de capas:

| Capa | Responsabilidad |
|---|---|
| `src/domain` | El comportamiento de cada entidad: clases con métodos (sin constructor) |
| `src/services` | Casos de uso, orquestación entre dominio y persistencia |
| `src/repositories` | Acceso a datos: MongoDB en la app, en memoria para los tests |
| `src/models` | Schemas de Mongoose: cómo se **guarda** cada documento, + `loadClass` de su clase de dominio |
| `src/controllers` | Traducción HTTP ↔ servicios |
| `src/routes` | Definición de endpoints y middlewares por ruta |
| `src/middlewares` | Validación, sanitización, límite de solicitudes, 404 y manejo de errores |
| `src/canales` | Adaptadores de salida hacia servicios externos: email (nodemailer), WhatsApp y SMS |
| `src/jobs` | Tareas periódicas: el cierre automático de proyectos |
| `src/schemas` | Schemas de Zod: la forma de lo que entra por HTTP |
| `src/composicion.js` | Raíz de composición: el único lugar que elige implementaciones |

La regla es que las dependencias apuntan siempre hacia adentro: los controllers
conocen a los services, los services a los modelos y a los repositories, y el
dominio no conoce a nadie.

Desde las correcciones de la segunda entrega, el modelo de Mongoose **es** la
entidad de dominio (`loadClass`, ver Persistencia): los services crean entidades
con el modelo (`new ColectivoModel(...)`) y los repositories solo consultan y
guardan. Un documento de Mongoose se puede crear sin conexión a la base, por eso
los tests con repositorios en memoria siguen sin necesitar Mongo.

Ningún controller ni service importa del contenedor: las dependencias entran
únicamente por constructor y se arman en `composicion.js`.

### Persistencia (MongoDB)

Mongoose es un **ODM** (*Object Document Mapper*): mapea objetos a documentos
(no a tablas, como un ORM).

**Una sola abstracción por entidad.** Cada schema de `src/models` carga su
clase de `src/domain` con `schema.loadClass(Clase)`:

```
src/domain/Proyecto.js        →  lo que el proyecto SABE HACER (métodos)
src/models/ColectivoModel.js  →  cómo se GUARDA (campos, defaults, índices)
                                 + proyectoSchema.loadClass(Proyecto)
```

Lo que devuelve Mongoose ya es un `Proyecto` con sus métodos
(`proyecto.aceptaPostulaciones()`), así que los repositorios no traducen nada:
buscan con `find`/`findById` y guardan con `save()`. Las clases de dominio no
tienen constructor (Mongoose no lo llama): los valores por defecto están en el
schema. Las entidades se crean con el modelo (`new ColaboradorModel({...})`) o
adentro de su contenedor (`colectivo.agregarProyecto(datos)`).

| Colección | Qué guarda | Relaciones |
|---|---|---|
| `habilidads` | El catálogo | `codigo` único (`desarrollo_node`), aparte del `_id` |
| `colaboradors` | Colaboradores | Copia `{codigo, titulo}` de sus habilidades |
| `colectivos` | El colectivo **con sus proyectos, perfiles, colaboraciones, logros y avances embebidos** | Copia de habilidades en perfiles; `colaborador` por referencia (ObjectId) |
| `notificaciones` | Los mensajes internos de cada persona | `destinatarioId` por referencia (ObjectId) |

(Los nombres en inglés "mal pluralizados" los pone Mongoose solo.)

Decisiones:

- **`_id` autogenerado.** Ningún schema pisa el `_id`: Mongoose genera un
  ObjectId para cada documento y subdocumento, y el virtual `id` lo expone
  como texto. Una clave de dominio va en otro campo con `unique` (el `codigo`
  de la habilidad), y se busca por ese campo.
- **Colectivo es el agregado raíz**: todo lo que le pertenece viaja dentro de
  su documento y se guarda entero.
- **Colaboradores por referencia + `populate`.** Son compartidos y cambian
  (nombre, presentación): se guarda el ObjectId y el repositorio los trae con
  `populate("proyectos.colaboraciones.colaborador")`, una consulta para toda la
  tanda.
- **Habilidades desnormalizadas.** Perfiles y personas guardan una copia
  `{codigo, titulo}` de cada habilidad. El catálogo es precargado y una
  habilidad no cambia de título, así que no hace falta ir a buscarla cada vez
  (ni con un join a mano ni con `populate`), y las búsquedas filtran directo
  por `habilidades.codigo`.
- **Notificaciones en su propia colección**, no embebidas en el colaborador:
  crecen sin límite y se consultan paginadas.
- **Concurrencia optimista** (`__v` + `optimisticConcurrency`) en el colectivo:
  si dos pedidos lo leen y lo guardan a la vez, el segundo `save()` falla con
  `VersionError` (409) en vez de pisar al primero.
- **`toJSON` por schema** (`models/formatoJSON.js`): `id` en vez de `_id`, sin
  `__v`, sin los medios de contacto de las personas y sin el autor de una
  contribución anónima.
- **Campos calculados.** `vacantesLibres` es un getter de `Proyecto`, o sea un
  *virtual*: se calcula y no se guarda. `porcentajeConcrecion`, `urlSistema` y
  `urlRepositorio` del proyecto sí se guardan, pero los calcula un hook
  `pre('validate')` a partir del último avance.
- **Búsquedas en la base.** Las colaboradoras y los proyectos potenciales se
  resuelven con el Aggregation Framework (filtrar, ordenar y paginar en Mongo),
  no trayendo todo a memoria.

Los repositorios en memoria guardan esos mismos documentos de Mongoose y
llaman a `validate()` antes de guardar: los tests unitarios pasan por los
schemas igual que la app.

## Segunda entrega: qué hace la API

La documentación completa de cada ruta está en Swagger (`/docs`). Este es el
mapa, con el requerimiento del enunciado que resuelve cada cosa.

### Requerimientos mínimos

| Funcionalidad | Rutas |
|---|---|
| Perfiles (CRUD) | `/proyectos/:id/perfiles...` |
| Logros (CRUD) | `/proyectos/:id/logros` y `/proyectos/:id/logros/:logroId` |
| Avances: porcentaje de concreción y enlaces, con historial | `POST /proyectos/:id/avances` (solo se agregan), `GET /proyectos/:id/avances` |
| Medios de contacto: se registran pero **nunca se muestran** | `POST /colaboradores/:id/medios-de-contacto`, `DELETE .../medios-de-contacto/:tipo/:valor` |
| Contribuciones anónimas | `esPublica: false` en `POST /proyectos/:id/colaboraciones` |
| Búsqueda de colaboradoras según un perfil | `GET /proyectos/:id/perfiles/:perfilId/colaboradoras-potenciales` |
| Contactarlas (mensaje interno) | `POST /proyectos/:id/perfiles/:perfilId/invitaciones` |
| Búsqueda de proyectos según las habilidades de la colaboradora | `GET /colaboradores/:id/proyectos-potenciales` |
| Notificaciones internas, replicadas por email/WhatsApp/SMS | `GET /colaboradores/:id/notificaciones`, `POST .../notificaciones/:notificacionId/lectura` |

### Requerimientos adicionales

| # | Requerimiento | Cómo |
|---|---|---|
| 8 | Aceptación y rechazo automático de postulaciones | `modoAceptacion` y `limiteVacantes` en el proyecto; `POST .../colaboraciones/:colaboracionId/aceptacion` y `/rechazo` |
| 9 | Notificaciones automáticas | Al crear un proyecto se avisa a las personas compatibles; al crear una persona, se le avisa qué proyectos le sirven |
| 10 | Cierre automático de proyectos | `fechaCierre` en el proyecto; `src/jobs/cierreAutomatico.js` revisa cada minuto |
| 11 | Sanitización | `src/middlewares/sanitizar.js`: saca todo el HTML de los textos que entran |
| 14 | Límite de solicitudes | `src/middlewares/limiteDeTasa.js`: 300 cada 15 min por IP; 30 por minuto en búsquedas y estadísticas |
| 16, 30 | Estadísticas globales / API pública | `GET /estadisticas`, con el Aggregation Framework |
| 17 | Estadísticas por organización | `GET /colectivos/:id/estadisticas`; `GET /proyectos/:id` suma visualizaciones |
| 19 | Línea de tiempo | `GET /colectivos/:id/timeline`: alta, proyectos, logros, avances, colaboraciones cerradas y baja |
| 23 | Eliminación de colectivos | `POST /colectivos/:id/baja` |
| 27 | Redes sociales | `redesSociales` en colectivos y colaboradores |
| 34 | Etiquetas | `etiquetas` en colectivos y proyectos; filtro `?etiqueta=` en los listados |
| 38 | Markdown (backend) | Las descripciones lo guardan intacto; el renderizado es del frontend (3ra entrega) |
| 39 | Valoraciones mutuas | `POST .../colaboraciones/:colaboracionId/finalizacion` y `/valoraciones`; `GET /colaboradores/:id/valoraciones`, `GET /colectivos/:id/valoraciones` |

Los adicionales 13, 18, 21, 29 y 35 quedan para la tercera entrega: todos
necesitan saber quién está usando la plataforma (un equipo administrativo, o la
organización dueña del proyecto), y los usuarios llegan con la autenticación.

### Ciclo de una postulación

```
                ┌──────────▶ ACEPTADA ──────────▶ FINALIZADA ──▶ se pueden valorar
  se postula ──▶ PENDIENTE
                └──────────▶ RECHAZADA
```

| Modo | Límite | Qué pasa |
|---|---|---|
| `TODO_SUMA` (por defecto) | no se permite | Se acepta en el momento |
| `HASTA_LLENAR_VACANTES` | obligatorio | Espera hasta juntar tantas como vacantes; ahí se aceptan todas y se cierra |
| `REVISION_MANUAL` | opcional | Nada automático |

Cerrar un proyecto (a mano, por fecha o porque el colectivo se dio de baja)
siempre tiene las mismas consecuencias: se rechazan las postulaciones pendientes
y terminan las colaboraciones en curso.

### Variables de entorno

| Variable | Obligatoria | Qué hace |
|---|---|---|
| `MONGO_URI` | sí | Conexión a MongoDB |
| `SERVER_PORT` | no (8000) | Puerto de la API |
| `SMTP_URL` | no | Servidor SMTP para mandar las notificaciones por email. Sin esto se simulan (quedan en el log) |
| `SMTP_REMITENTE` | no | El "De:" de esos emails |
| `LIMITE_SOLICITUDES_GENERAL` | no (300) | Solicitudes por IP cada 15 minutos |
| `LIMITE_SOLICITUDES_BUSQUEDAS` | no (30) | Solicitudes por IP por minuto en búsquedas y estadísticas |
| `CIERRE_AUTOMATICO_INTERVALO_MS` | no (60000) | Cada cuánto se buscan proyectos con la fecha de cierre vencida |

WhatsApp y SMS se simulan siempre: requieren un proveedor pago y el enunciado
pide privilegiar herramientas económicas. Enchufar uno real es escribir otra
clase con un método `enviar()` en `src/canales/` y cambiar una línea en
`composicion.js`.

### Manejo de errores

Los controllers **no tienen `try/catch`**. Cada capa lanza la excepción que le
corresponde y hay un solo lugar que la traduce a HTTP:

```
service / dominio          middlewares/manejadorErrores.js        respuesta
─────────────────────      ───────────────────────────────        ─────────
throw ZodError        ──▶  (validación de forma)             ──▶  400 + issues
throw DomainError     ──▶  err.status                        ──▶  400
throw BadRequestError ──▶  err.status                        ──▶  400
throw NotFoundError   ──▶  err.status                        ──▶  404
throw ConflictError   ──▶  err.status                        ──▶  409
Mongoose ValidationError / CastError                         ──▶  400
Mongoose VersionError (otro pedido guardó antes)             ──▶  409
cualquier otra cosa   ──▶  console.error + genérico          ──▶  500
```

El manejador se registra último en `app.js` y declara cuatro parámetros: así es
como Express reconoce un error handler y le entrega el error. Express 5 también
captura las promesas rechazadas, así que esto va a seguir funcionando cuando los
repositorios sean `async` contra MongoDB.

### Forma de las respuestas

El resultado de la operación lo dice el código HTTP, no un campo del body.

| Caso | Body |
|---|---|
| Un recurso | el objeto directo, sin envoltorio |
| Un listado paginado | `{ data: [...], meta: { page, per_page, total, total_pages } }` |
| Un error | `{ message }`, más `issues` si es de validación |

> **Cambio respecto de la primera entrega.** Las respuestas ya no traen el campo
> `status`, y `PATCH /proyectos/:id` fue reemplazado por
> `POST /proyectos/:id/finalizacion`. Cualquier cliente que leyera
> `respuesta.data` para un recurso individual tiene que ajustarse.

## Puesta en marcha

### Con Docker (recomendado)

Levanta la API y MongoDB juntos. Solo hace falta Docker Desktop.

```bash
docker compose up -d --build     # construye la imagen y levanta api + mongo
docker compose logs -f api       # ver los logs de la api (Ctrl+C para salir)
```

Verificación: `curl http://localhost:8000/health`

| Comando | Qué hace |
|---|---|
| `docker compose up -d --build` | Levanta todo. **Usar `--build` después de cada cambio de código** |
| `docker compose ps` | Estado de los contenedores |
| `docker compose logs -f api` | Logs de la api en vivo |
| `docker compose restart api` | Reinicia solo la api |
| `docker compose down` | Baja los contenedores. **Los datos se conservan** |
| `docker compose down -v` | Baja todo **y borra la base** (el volumen `mongo-data`) |
| `docker exec -it cav-mongo mongosh codigo-a-voluntad` | Consola de Mongo |

> **Ojo con el `--build`.** El `Dockerfile` copia el código **adentro de la
> imagen** al construirla. Si editás un archivo y hacés solo `docker compose up`
> o `restart`, el contenedor sigue corriendo el código viejo.

En desarrollo, Mongo publica el puerto 27017 para poder conectarse con Compass
(`mongodb://localhost:27017`).

### Sin Docker

Necesitás un MongoDB corriendo en `localhost:27017` (instalado, o solo el de
Docker con `docker compose up -d mongo`).

```bash
npm install                                        # instala todos los workspaces
cp packages/backend/.env.example packages/backend/.env
npm run dev:backend                                # con recarga automática
```

El `.env` tiene que tener `MONGO_URI`; si falta, el backend no arranca. El puerto
sale de `SERVER_PORT` (default 8000) y el backend escucha en `0.0.0.0`. Al
arrancar carga el catálogo de habilidades semilla si la colección está vacía.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev:backend` | Backend con recarga automática (`node --watch`) |
| `npm run start:backend` | Backend sin recarga (es el que corre dentro del contenedor) |
| `npm test` | Tests unitarios de dominio, servicios y rutas (Jest, sin base) |
| `npm run test:integracion` | Tests de integración contra Mongo (ver abajo) |
| `npm run lint` | ESLint sobre todo el repo |
| `npm run format` | Prettier sobre todo el repo |
| `npm run start:frontend` | *Pendiente: se habilita en la 3ra entrega* |

## Tests

Jest sobre la capa de dominio y la de servicios, sin base de datos: los
services se arman con los repositorios en memoria
(`componerApp({ repositorios: crearRepositoriosEnMemoria() })`, ver
`tests/fixtures.js`). No hace falta tener Mongo ni Docker levantados.

Además, `tests/http/` levanta la app Express entera (rutas, validación,
sanitización, límite de solicitudes) sobre esos mismos repositorios y le hace
pedidos con supertest, sin abrir un puerto. Prueban lo que los tests de services
no ven: que una ruta exista, que Zod rechace lo que tiene que rechazar y que la
respuesta no muestre lo que no debe (medios de contacto, autores anónimos).

| Carpeta | Qué prueba |
|---|---|
| `tests/domain` | Entidades |
| `tests/services` | Casos de uso, con repositorios en memoria |
| `tests/http` | Rutas y middlewares, con supertest |
| `tests/middlewares` | La sanitización de textos |

```bash
npm test                                     # todo
npm test --workspace=backend -- --watch      # en watch
```

Por eso las implementaciones en memoria **no se borran** con MongoDB: son el
doble de test que hace posible correr estos tests sin levantar una base.

### Tests de integración (contra Mongo)

`tests/integracion/` usa los repositorios de Mongo de verdad, sobre una base
aparte del mismo motor: `codigo-a-voluntad-test`. Antes de cada test la base se
dropea, se recrean los índices y se siembra el catálogo, así que cada test
arranca de cero. Se niegan a correr si la base no termina en `-test`.

```bash
docker compose up -d mongo     # Mongo local en 127.0.0.1:27017
npm run test:integracion
```

| Archivo | Qué prueba |
|---|---|
| `persistencia.test.js` | Cada entidad vuelve de la base con **todos** sus campos (Mongoose descarta en silencio lo que no está en el schema) |
| `busquedas.test.js` | Los pipelines de colaboradoras y proyectos potenciales, contra los métodos de dominio |
| `estadisticas.test.js` | Los pipelines de estadísticas dan lo mismo que el cálculo en memoria |
| `concurrencia.test.js` | El `VersionError` cuando dos pedidos guardan el mismo colectivo |
| `api.test.js` | La app Express entera contra Mongo (test de integración de controladores) |

Otra base: `MONGO_URI_TEST=mongodb://.../otra-base-test npm run test:integracion`.

## Despliegue

VM en Oracle Cloud, región San Pablo (la más cercana): Ubuntu 20.04, 1 GB de
RAM + 2 GB de swap, con Docker y Docker Compose instalados. La API y MongoDB
corren en contenedores con `docker-compose.prod.yml`.

```
http://147.15.102.156:8000/health
http://147.15.102.156:8000/docs
```

La IP es de Oracle y puede cambiar si se recrea la instancia; conviene
reservarla desde la consola. Para verificar la actual, desde la VM:
`curl -s ifconfig.me`.

### Qué cambia respecto de desarrollo

`docker-compose.prod.yml` es un archivo aparte, no un agregado al de desarrollo:

- **Mongo no publica ningún puerto.** La API le habla por la red interna de
  Compose (el host `mongo`). Ver "Puertos" más abajo.
- **Mongo tiene usuario y contraseña**, que se leen del archivo `.env` de la raíz
  del repo (no se commitea; la plantilla es `.env.prod.example`).
- **Límites de memoria**, uno por proceso (ver "Memoria" más abajo).
- La API espera a que Mongo esté sano (healthcheck) antes de arrancar.
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
#    (Si en otra VM se hubiera instalado el unit de systemd de deploy/, en su
#    lugar: sudo systemctl disable --now codigo-a-voluntad)

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

### Puertos

Para que un puerto de un contenedor llegue a internet hacen falta tres cosas:

```
contenedor ──"ports" del compose──▶ VM ──firewall de la VM──▶ Security List de Oracle ──▶ internet
```

| Pieza | Dónde | Qué hace |
|---|---|---|
| `EXPOSE 8000` | `Dockerfile` | Nada en la red: documenta en qué puerto escucha la app |
| `ports: "8000:8000"` | compose | Enlaza `puerto_de_la_VM:puerto_del_contenedor` (podría ser `"9000:8000"`) |
| Firewall de Ubuntu | la VM | Filtro de la máquina. Ojo: los puertos que publica Docker se lo saltean |
| Security List | consola de Oracle → VCN | El firewall de la nube: sin una regla de entrada para el puerto, no llega nada |

El 8000 de la API está abierto en la Security List (por eso se llega desde el
navegador). Para exponer Mongo habría que publicar el 27017 **y** abrirlo en
Oracle; como no se publica, aunque se abriera en Oracle por error no habría
nada escuchando.

### Memoria

Son dos límites distintos, y cada uno limita a un proceso:

| Configuración | Limita a | Qué es |
|---|---|---|
| `--wiredTigerCacheSizeGB 0.25` | Mongo | La caché de su motor de almacenamiento. El proceso entero usa algo más |
| `NODE_OPTIONS=--max-old-space-size=256` | La API | El heap de V8, en MB. Node usa más que eso en total (~350-400 MB) |
| `mem_limit` | Cada contenedor | Techo duro (cgroups de Linux): si se pasa, el kernel mata el proceso y Docker lo reinicia |

El consumo real se mira con `docker stats --no-stream`.

### Actualizar después de un cambio

```bash
cd ~/tp-desarrollo-2c-2026
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker image prune -f        # borra las imágenes viejas (el disco es chico)
```

> **Al desplegar las correcciones de la segunda entrega** (`_id` autogenerado,
> habilidades copiadas en vez de referenciadas) los datos viejos dejan de ser
> compatibles. Antes de levantar, hacer un backup (ver abajo) y vaciar la
> base: `docker compose -f docker-compose.prod.yml down -v`. Al arrancar, la
> API vuelve a sembrar el catálogo de habilidades.

### Operación

| Comando | Qué hace |
|---|---|
| `docker compose -f docker-compose.prod.yml ps` | Estado |
| `docker compose -f docker-compose.prod.yml logs -f api` | Logs de la api |
| `docker compose -f docker-compose.prod.yml restart api` | Reiniciar la api |
| `docker stats --no-stream` | Consumo de memoria de cada contenedor |
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
