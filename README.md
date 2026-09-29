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
| `src/domain` | Entidades, value objects y reglas de negocio |
| `src/services` | Casos de uso, orquestación entre dominio y persistencia |
| `src/repositories` | Acceso a datos: MongoDB en la app, en memoria para los tests |
| `src/models` | Schemas de Mongoose: la forma en que se **guarda** cada documento |
| `src/controllers` | Traducción HTTP ↔ servicios |
| `src/routes` | Definición de endpoints y middlewares por ruta |
| `src/middlewares` | Validación de la entrada, 404 y manejo de errores |
| `src/schemas` | Schemas de Zod: la forma de lo que entra por HTTP |
| `src/composicion.js` | Raíz de composición: el único lugar que elige implementaciones |

La regla es que las dependencias apuntan siempre hacia adentro: los controllers
conocen a los services, los services al dominio y a los repositories, y el dominio
no conoce a nadie. Esto es lo que nos permite cambiar el almacenamiento en memoria
por MongoDB en la segunda entrega tocando solo la capa de repositories.

Ningún controller ni service importa del contenedor: las dependencias entran
únicamente por constructor y se arman en `composicion.js`.

### Persistencia (MongoDB)

Las entidades de dominio siguen siendo clases con métodos. Cada repositorio
Mongo traduce en los dos sentidos: `aDocumento()` arma lo que se guarda y
`aDominio()` reconstruye la clase al leer. Los services no saben que existe
Mongo.

| Colección | Qué guarda | Referencias |
|---|---|---|
| `habilidads` | El catálogo. `_id` es el código (`desarrollo_node`) | — |
| `colaboradors` | Colaboradores | `codigosHabilidades` |
| `colectivos` | El colectivo **con sus proyectos, perfiles y colaboraciones embebidos** | `codigosHabilidades*` en perfiles, `colaboradorId` en colaboraciones |

Colectivo es el agregado raíz: todo lo que le pertenece viaja dentro de su
documento y se guarda entero. Habilidades y colaboradores son compartidos, así
que se guardan por referencia y se rehidratan al leer. (Los nombres de colección
en inglés "mal pluralizados" los pone Mongoose automáticamente.)

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
| `npm test` | Tests unitarios de dominio y servicios (Jest) |
| `npm run lint` | ESLint sobre todo el repo |
| `npm run format` | Prettier sobre todo el repo |
| `npm run start:frontend` | *Pendiente: se habilita en la 3ra entrega* |

## Tests

Jest sobre la capa de dominio y la de servicios, sin HTTP y sin base de datos:
los services se arman con los repositorios en memoria
(`componerApp({ repositorios: crearRepositoriosEnMemoria() })`, ver
`tests/fixtures.js`). No hace falta tener Mongo ni Docker levantados.

```bash
npm test                                     # todo
npm test --workspace=backend -- --watch      # en watch
```

Por eso las implementaciones en memoria **no se borran** cuando llegue MongoDB:
son el doble de test que hace posible correr estos tests sin levantar una base.

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
  Compose. Un puerto publicado por Docker se saltea el firewall de Ubuntu, así
  que la única forma segura es no publicarlo.
- **Mongo tiene usuario y contraseña**, que se leen del archivo `.env` de la raíz
  del repo (no se commitea; la plantilla es `.env.prod.example`).
- La cache de Mongo está limitada a 256 MB y la de Node a 256 MB, para que
  entren en 1 GB.
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

### Actualizar después de un cambio

```bash
cd ~/tp-desarrollo-2c-2026
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker image prune -f        # borra las imágenes viejas (el disco es chico)
```

### Operación

| Comando | Qué hace |
|---|---|
| `docker compose -f docker-compose.prod.yml ps` | Estado |
| `docker compose -f docker-compose.prod.yml logs -f api` | Logs de la api |
| `docker compose -f docker-compose.prod.yml restart api` | Reiniciar la api |
| `docker stats --no-stream` | Consumo de memoria de cada contenedor |
| `docker exec -it cav-mongo mongosh -u <usuario> -p --authenticationDatabase admin codigo-a-voluntad` | Consola de Mongo (pide la contraseña) |

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
