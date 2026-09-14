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
| `src/repositories` | Acceso a datos (en memoria en la 1ra entrega, MongoDB en la 2da) |
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

```bash
npm install                                        # instala todos los workspaces
cp packages/backend/.env.example packages/backend/.env
npm run dev:backend                                # con recarga automática
```

Verificación: `curl http://localhost:8000/health`

El puerto sale de `SERVER_PORT` (default 8000) y el backend escucha en `0.0.0.0`.
Al arrancar carga el catálogo de habilidades semilla.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev:backend` | Backend con recarga automática (`node --watch`) |
| `npm run start:backend` | Backend sin recarga (es el que usa el deploy) |
| `npm test` | Tests unitarios de dominio y servicios (Jest) |
| `npm run lint` | ESLint sobre todo el repo |
| `npm run format` | Prettier sobre todo el repo |
| `npm run start:frontend` | *Pendiente: se habilita en la 3ra entrega* |

## Tests

Jest sobre la capa de dominio y la de servicios, sin HTTP y sin base de datos:
los services se arman con los repositorios en memoria.

```bash
npm test                                     # todo
npm test --workspace=backend -- --watch      # en watch
```

Por eso las implementaciones en memoria **no se borran** cuando llegue MongoDB:
son el doble de test que hace posible correr estos tests sin levantar una base.

## Despliegue

VM en Oracle Cloud, región San Pablo (la más cercana), Ubuntu con Node instalado
y el repositorio clonado.

```
http://147.15.102.156:8000/health
http://147.15.102.156:8000/docs
```

La IP es de Oracle y puede cambiar si se recrea la instancia; conviene
reservarla desde la consola. Para verificar la actual, desde la VM:
`curl -s ifconfig.me`.

El proceso lo administra systemd, no se levanta a mano: ver
`deploy/codigo-a-voluntad.service` para la instalación y los comandos de
operación (estado, logs, restart después de un `git pull`).

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
