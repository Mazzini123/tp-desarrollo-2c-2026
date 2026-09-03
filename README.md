# Código a Voluntad — TP Integrador DDS 2C 2026

Plataforma que conecta colectivos (fundaciones, ONGs, asambleas, organizaciones
territoriales) con personas colaboradoras del ámbito del desarrollo de software.

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
| `src/routes` | Definición de endpoints |

La regla es que las dependencias apuntan siempre hacia adentro: los controllers
conocen a los services, los services al dominio y a los repositories, y el dominio
no conoce a nadie. Esto es lo que nos permite cambiar el almacenamiento en memoria
por MongoDB en la segunda entrega tocando solo la capa de repositories.

## Puesta en marcha

```bash
npm install
cp packages/backend/.env.example packages/backend/.env
npm run dev:backend
```

Verificación: `curl http://localhost:8000/health`

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev:backend` | Backend con recarga automática |
| `npm run start:backend` | Backend sin recarga |
| `npm run start:frontend` | Frontend (cuando exista) |
| `npm run start:dev` | Backend y frontend en paralelo |
| `npm test` | Tests unitarios del backend |
| `npm run lint` | ESLint sobre todo el repo |
| `npm run format` | Prettier sobre todo el repo |

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
