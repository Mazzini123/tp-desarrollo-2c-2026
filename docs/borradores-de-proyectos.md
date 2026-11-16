# Borradores de proyectos con aprobación de administración

Origen: adicional 29 del enunciado. Se apoya en la base de `administracion-de-plataforma.md` (contexto `ADMINISTRACION`, auditoría y cola de revisiones).

Estado: implementado en el back el 15/11/2026 con las decisiones P1 a P7 aprobadas. El front va después, en otra sesión.

## Intención

Un colectivo puede preparar un proyecto sin publicarlo, ajustarlo con calma y pedir que administración lo revise antes de que lo vea nadie. Mientras no se publica, el proyecto no existe para el resto de la plataforma: no aparece en listados, búsquedas, estadísticas ni avisos.

Rol: colectivos (líder y miembros con permiso de edición) y administración.

## Decisiones aprobadas

1. Estados: `BORRADOR` → `EN_REVISION` → `ABIERTO` (→ `FINALIZADO`, como hoy). El rechazo vuelve de `EN_REVISION` a `BORRADOR`.
2. Los proyectos nuevos se siguen publicando directo (`ABIERTO`) como hoy. Solo nacen como borrador si el pedido trae `borrador: true`. No cambia el comportamiento actual.
3. Un borrador lo ven solo su colectivo (dueño) y administración. Se edita como un proyecto abierto: datos, perfiles y habilidades.
4. Pedir la publicación crea una revisión `PENDIENTE` con motivo nuevo `PUBLICACION` y pasa el proyecto a `EN_REVISION`. En revisión no se puede editar.
5. Administración resuelve desde la cola de revisiones que ya existe:
   - `REVISADA` = aprobar: el proyecto pasa a `ABIERTO`, se avisa a las compatibles (`avisarPorProyectoNuevo`) y se audita `PROYECTO_PUBLICADO`.
   - `DESCARTADA` = rechazar: el proyecto vuelve a `BORRADOR` con la nota visible para el colectivo y se audita `PUBLICACION_RECHAZADA`.
6. Un borrador no avisa a nadie al crearse.
7. Rigen las reglas de la base: conflicto de intereses (422 `CONFLICTO_DE_INTERESES`), auditoría en la misma transacción, y 403 para quien no tiene el permiso.

## Decisiones de esta spec (aprobadas con el plan)

- P1. Dónde se guarda la nota del rechazo. Se agrega al proyecto un subdocumento `publicacion`:
  `{ solicitadaEn, revisionId, rechazo: { nota, fecha } | null, aprobadaEn }`. La revisión sigue siendo la fuente de verdad (con autor y nota); el proyecto guarda una copia para leerla sin ir a `revisiones` y sin exponer quién resolvió. Pedir de nuevo la publicación limpia `rechazo`. Ausente en proyectos publicados directo.
- P2. Sub-recursos públicos del proyecto. Además de las lecturas que pide el enunciado, hoy son públicos `GET /proyectos/:id/perfiles`, `/perfiles/:perfilId`, `/participaciones`, `/logros`, `/logros/:logroId`, `/avances` y `/avances/:avanceId`. Si no se cubren, un borrador se filtra por ahí. Propuesta: mismo criterio que el detalle (404 salvo dueño o administración), con un guarda compartido.
- P3. El filtro `estado` de `GET /proyectos` acepta solo `ABIERTO` y `FINALIZADO`; `BORRADOR` o `EN_REVISION` dan 400.
- P4. El colectivo dueño ve sus borradores y proyectos en revisión en `GET /colectivos/:id/proyectos` y en el detalle del colectivo (con su `estado`); el resto no. `cantidadProyectos` del listado de colectivos cuenta solo publicados.
- P5. Fecha de cierre: al pedir la publicación, si la `fechaCierre` ya pasó, 422 (el colectivo la corrige en el borrador). Al aprobar, si venció mientras estaba en revisión, 422 y la revisión queda pendiente: administración puede rechazarla para que el colectivo la corrija.
- P6. Abrir el detalle de un borrador o un proyecto en revisión no suma visualizaciones.
- P7. La resolución de una revisión de publicación audita solo la acción nueva (`PROYECTO_PUBLICADO` o `PUBLICACION_RECHAZADA`, entidad `PROYECTO`, detalle `{ revisionId }`), no además `REVISION_RESUELTA`. Las demás revisiones siguen igual.

## Qué ya funciona y no se toca

- `POST /colectivos/:id/proyectos` sin `borrador` (o con `false`) publica directo, con idempotencia y avisos como hoy.
- Cola de revisiones: índice único parcial `(proyectoId, motivo)` en `PENDIENTE`, `resolverSiPendiente`, conflicto de intereses, 409 al resolver dos veces.
- Postularse, destacar, seguimiento (adicional 35), cierre automático, logros y avances ya exigen `ABIERTO`. Se confirma con tests, sin cambiar código.

## Modelo

- `PROYECTO_ESTADO`: `BORRADOR`, `EN_REVISION`, `ABIERTO`, `FINALIZADO`. Además, `ESTADOS_PUBLICADOS = [ABIERTO, FINALIZADO]` para las lecturas públicas.
- `MOTIVO_REVISION.PUBLICACION`.
- `ACCION_ADMINISTRATIVA.PROYECTO_PUBLICADO` y `ACCION_ADMINISTRATIVA.PUBLICACION_RECHAZADA`.
- `Proyecto` (dominio): `estaPublicado()`, `esEditable()` (`BORRADOR` o `ABIERTO`), `pedirPublicacion(ahora, revisionId)`, `aprobarPublicacion(ahora)`, `rechazarPublicacion(nota, ahora)`.
- `ProyectoModel`: subdocumento `publicacion` (P1).

## Endpoints

| Método y ruta                                    | Quién                    | Qué cambia                                                                                               |
| ------------------------------------------------ | ------------------------ | -------------------------------------------------------------------------------------------------------- |
| `POST /colectivos/:id/proyectos`                 | Dueño, `PROYECTO_CREAR`  | Acepta `borrador: boolean` opcional. Con `true` nace `BORRADOR` y no avisa.                              |
| `POST /proyectos/:id/publicacion`                | Dueño, `PROYECTO_EDITAR` | Nuevo. Solo desde `BORRADOR` (si no, 409). Crea la revisión y pasa a `EN_REVISION`. 200 con el proyecto. |
| `POST /administracion/revisiones/:id/resolucion` | `REVISION_RESOLVER`      | Ramifica por motivo. Si es `PUBLICACION` y el proyecto ya no está `EN_REVISION`, 409.                    |
| `PUT /proyectos/:id` y edición de perfiles       | Dueño                    | Permitida en `BORRADOR` y `ABIERTO`; en `EN_REVISION` o `FINALIZADO`, 409.                               |
| `GET /proyectos/:id` y sub-recursos (P2)         | Público                  | 404 si no está publicado, salvo dueño o administración.                                                  |

## Visibilidad (lecturas públicas que excluyen `BORRADOR` y `EN_REVISION`)

1. `GET /proyectos`, con y sin filtro `estado`.
2. `GET /proyectos/destacados` (ya filtra `ABIERTO`; se confirma).
3. Compatibles: `GET /colaboradores/:id/proyectos-potenciales` y los avisos (ya filtran `ABIERTO`; se confirma).
4. `GET /colectivos/:id/timeline`.
5. `GET /estadisticas` (globales: `proyectosPorEstado` y habilidades más requeridas).
6. `GET /colectivos/:id/estadisticas`.
7. Conteos: `cantidadProyectos` de `GET /colectivos` y `perfiles_abiertos`.
8. `GET /colectivos/:id/proyectos` y `GET /colectivos/:id` para quien no es el dueño (P4).
9. Detalle y sub-recursos (P2).

## Escenarios

1. Un colectivo crea un proyecto sin `borrador`: nace `ABIERTO` y encola el aviso, como hoy.
2. Con `borrador: true`: nace `BORRADOR`, sin aviso; el dueño lo ve y lo edita (datos y perfiles).
3. Cada lectura pública de la lista de visibilidad, con un borrador y un proyecto en revisión creados antes, no los muestra ni los cuenta.
4. El detalle de un borrador da 404 sin sesión, a otro colectivo y a una colaboradora; 200 al dueño y a administración, con `estado` y `publicacion`.
5. El dueño pide la publicación: 200, `EN_REVISION`, aparece una revisión `PENDIENTE` de motivo `PUBLICACION`. Pedirla otra vez da 409. Otro colectivo recibe 403.
6. En `EN_REVISION`, editar el proyecto o sus perfiles da 409.
7. Administración aprueba (`REVISADA`): `ABIERTO`, aparece en los listados públicos, se encola el aviso a compatibles y queda `PROYECTO_PUBLICADO` en la auditoría.
8. Administración rechaza (`DESCARTADA`) con nota: `BORRADOR`, el dueño ve `publicacion.rechazo.nota`, queda `PUBLICACION_RECHAZADA` en la auditoría. Puede editarlo y volver a pedir la publicación.
9. Una revisión de publicación cuyo proyecto ya no está `EN_REVISION` responde 409 y no cambia nada (ni revisión ni auditoría).
10. Un administrador líder del colectivo del proyecto recibe 422 `CONFLICTO_DE_INTERESES` al resolverla.
11. Postularse, destacar, seguimiento y cierre automático sobre un borrador o un proyecto en revisión: rechazados u omitidos.
12. Rollback: si falla la auditoría al aprobar, el proyecto sigue `EN_REVISION` y la revisión `PENDIENTE`.

## Requisitos

- Aprobar y rechazar ocurren en una transacción: revisión, proyecto, auditoría y aviso.
- La nota se sanitiza como el resto de los textos.
- La vista pública nunca muestra `publicacion`; el dueño y administración sí.
- Ningún cambio en el comportamiento de quien no manda `borrador`.

## Fuera de alcance

- El front (crear como borrador, "Pedir publicación", estado y nota en el detalle, cola de publicaciones en `/admin`).
- Borrar un borrador.
- Avisos al colectivo por correo cuando se aprueba o rechaza (puede sumarse después con `notificacionService`).
