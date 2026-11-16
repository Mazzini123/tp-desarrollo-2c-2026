# Términos y condiciones, y bajas por infracción

Origen: adicional 21 del enunciado: «Mecanismo para definir, actualizar y evaluar el cumplimiento de términos y condiciones en los proyectos, pudiendo dar de baja proyectos u organizaciones en infracción». Cierra además la auditoría del adicional 13: las acciones nuevas quedan en el mismo registro. Se apoya en la base de `administracion-de-plataforma.md` (contexto `ADMINISTRACION`, auditoría en la misma transacción y conflicto de intereses) y reusa la exclusión de `borradores-de-proyectos.md`.

Estado: implementado en el back el 16/11/2026. El front va después, en otra sesión.

## Intención

Administración publica las reglas de uso de la plataforma y las versiona. Un colectivo las acepta al crear cada proyecto, y queda registrado qué versión aceptó. Cuando un proyecto o una organización no las cumple, administración lo da de baja, con un motivo que el colectivo puede leer, y todo queda en la auditoría.

Rol: administración (publica términos y da de baja) y colectivos (aceptan los términos y leen el motivo de una baja).

## Decisiones

1. Versión única. Hay un solo documento vigente: `{ version, texto, publicadoEn, publicadoPor }`. `version` es un entero que sube de a uno (la primera es 1). `texto` es Markdown y se sanitiza como las descripciones (se conserva el código).
2. Las versiones anteriores no se borran: cada publicación es una fila nueva de la colección `terminos`, y la vigente es la de `version` más alta. El índice único sobre `version` hace que dos publicaciones simultáneas no puedan quedarse con el mismo número (la segunda recibe 409).
3. Si todavía no se publicó ninguna versión, no se exige nada y el alta de proyectos funciona como hasta ahora.
4. La aceptación se pide al crear un proyecto, borradores incluidos: `terminosAceptados` tiene que ser la versión vigente. El proyecto guarda `terminos: { version, aceptadosEn }`. No se pide volver a aceptar cuando sale una versión nueva.
5. Cumplimiento (lo mínimo que sirve). El detalle del proyecto (`GET /proyectos/:id`) muestra `terminos` al colectivo dueño y a administración. Comparando `terminos.version` con la `version` de `GET /terminos` se distingue un proyecto que aceptó una versión vieja; `terminos: null` es un proyecto creado antes de que hubiera términos. No hay filtro por versión (ver Fuera de alcance).
6. Baja de proyecto: estado nuevo `DADO_DE_BAJA`, fuera de `ESTADOS_PUBLICADOS`. Queda excluido de toda lectura pública por la misma vía que un borrador, sin consultas nuevas. El motivo queda en `baja: { motivo, fecha }`, visible solo para el colectivo dueño y administración.
7. Al dar de baja un proyecto se resuelven sus colaboraciones como al cerrarlo: las postulaciones pendientes se rechazan y las aceptadas se finalizan, con los mismos avisos. Sus revisiones pendientes (de seguimiento o de publicación) se descartan con el motivo como nota: si no, una revisión de publicación quedaría pendiente para siempre, porque resolverla exige `EN_REVISION`.
8. Baja de colectivo: reusa `MembresiaService.darDeBajaColectivo`, la misma baja que `POST /colectivos/:id/baja` (cierra sus proyectos abiertos, cancela las solicitudes de ingreso y desactiva los contextos de sus miembros). Lo único nuevo es la auditoría con el motivo. El motivo no se guarda en el colectivo: queda en la auditoría.
9. Conflicto de intereses: un administrador que es líder o miembro del colectivo recibe 422 `CONFLICTO_DE_INTERESES` en las dos bajas. Publicar términos no tiene conflicto posible.
10. Listado para dar de baja: `GET /administracion/proyectos` (permiso `BAJA_POR_INFRACCION`) trae todos los estados salvo `DADO_DE_BAJA`, para poder encontrar también borradores y proyectos en revisión. Cada fila trae lo justo para la pantalla de bajas (`id`, `titulo`, `estado`, `fechaCreacion`, `colectivo: { id, nombre }`) y `conflictoDeIntereses`, que anticipa el 422 de la baja para quien es líder o miembro del colectivo. `q` busca en el título o en el nombre del colectivo con la misma regla que la búsqueda de colectivos (sin mayúsculas ni tildes). Mismo orden y paginación que `GET /proyectos`, sin adelantar destacados.
11. `GET /colectivos/:id/proyectos` suma `baja` y `publicacion` (o `null`) por proyecto, solo para el colectivo dueño y con la misma forma que el detalle. Así el front no pide el detalle de cada proyecto sin publicar o dado de baja. Administración y el público no los reciben en el listado.
12. Permisos nuevos, solo del rol `ADMIN`: `TERMINOS_GESTIONAR` y `BAJA_POR_INFRACCION` (las dos bajas usan el mismo). Se cargan con el seed de catálogos que corre al arrancar la API: una base existente los recibe al reiniciar.

## Modelo

- `PROYECTO_ESTADO.DADO_DE_BAJA`. `ESTADOS_PUBLICADOS` sigue siendo `[ABIERTO, FINALIZADO]`.
- `Proyecto` (dominio): `estaDadoDeBaja()` y `darDeBaja(motivo, fecha)`. La resolución de colaboraciones (`darDeBajaProyecto` en `reglasDePostulacion.js`) comparte el código con `cerrarProyecto`.
- `ProyectoModel`: subdocumentos opcionales `terminos: { version, aceptadosEn }` y `baja: { motivo, fecha }`. Los proyectos existentes no los tienen y no hace falta migración.
- `TerminosModel` (colección `terminos`): `version` (único), `texto`, `publicadoEn`, `publicadoPor`.
- `ACCION_ADMINISTRATIVA`: `TERMINOS_ACTUALIZADOS`, `PROYECTO_DADO_DE_BAJA`, `COLECTIVO_DADO_DE_BAJA`. `TIPO_ENTIDAD_AUDITADA`: `COLECTIVO`, `TERMINOS`.
- `CODIGO_ERROR.TERMINOS_NO_ACEPTADOS`.
- Reglas puras en `reglasDeTerminos.js` (`siguienteVersion`, `aceptacionDeTerminos`); servicios `TerminosService` y `BajaPorInfraccionService`.

## Endpoints

| Método y ruta                                                   | Quién                   | Respuesta                                                                                                      | Errores                                                                |
| --------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `GET /terminos`                                                 | Público                 | 200 `{ version, texto, publicadoEn }`                                                                          | 404 si no hay términos                                                 |
| `PUT /administracion/terminos` `{ texto }`                      | `TERMINOS_GESTIONAR`    | 201 `{ version, texto, publicadoEn, publicadoPor }`                                                            | 400, 401, 403, 409 (publicación simultánea)                            |
| `POST /colectivos/:id/proyectos` `{ ..., terminosAceptados }`   | Dueño, `PROYECTO_CREAR` | 201 como hoy                                                                                                   | 422 `TERMINOS_NO_ACEPTADOS`, `detalle: { versionVigente }`             |
| `POST /administracion/proyectos/:id/baja` `{ motivo }`          | `BAJA_POR_INFRACCION`   | 200 `{ id, estado: "DADO_DE_BAJA", baja: { motivo, fecha } }`                                                  | 400, 401, 403, 404, 409, 422 `CONFLICTO_DE_INTERESES`                  |
| `POST /administracion/colectivos/:id/baja` `{ motivo }`         | `BAJA_POR_INFRACCION`   | 200 `{ id, fechaBaja }`                                                                                        | 400, 401, 403, 404, 409, 422 `CONFLICTO_DE_INTERESES`                  |
| `GET /proyectos/:id`                                            | Dueño y administración  | Suma `terminos` y `baja` (o `null`)                                                                            | —                                                                      |
| `GET /administracion/proyectos` `?page&limit&q&etiqueta&estado` | `BAJA_POR_INFRACCION`   | 200 `{ data: [{ id, titulo, estado, fechaCreacion, colectivo: { id, nombre }, conflictoDeIntereses }], meta }` | 400 (`estado=DADO_DE_BAJA`, `q` de más de 80, `limit` > 100), 401, 403 |
| `GET /colectivos/:id/proyectos`                                 | Dueño                   | Suma `publicacion` y `baja` (o `null`) en cada proyecto                                                        | —                                                                      |

`texto` admite hasta 50.000 caracteres y `motivo` hasta 1.000; los dos se recortan y no pueden quedar vacíos. `terminosAceptados` es un entero positivo.

## Auditoría (cierre del adicional 13)

Toda acción administrativa que cambia datos deja su registro en la misma transacción. Con este adicional, el registro cubre:

| Acción                                             | Entidad     | Detalle                          |
| -------------------------------------------------- | ----------- | -------------------------------- |
| `PROYECTO_DESTACADO`, `PROYECTO_DESTACADO_QUITADO` | `PROYECTO`  | `{ hasta, cambio? }`             |
| `REVISION_RESUELTA`                                | `REVISION`  | `{ estado, motivo }`             |
| `PROYECTO_PUBLICADO`, `PUBLICACION_RECHAZADA`      | `PROYECTO`  | `{ revisionId }`                 |
| `ADMIN_OTORGADO`                                   | `USUARIO`   | `{ origen }` si vino del comando |
| `TERMINOS_ACTUALIZADOS`                            | `TERMINOS`  | `{ version }`                    |
| `PROYECTO_DADO_DE_BAJA`                            | `PROYECTO`  | `{ motivo }`                     |
| `COLECTIVO_DADO_DE_BAJA`                           | `COLECTIVO` | `{ motivo }`                     |

`GET /administracion/auditoria` acepta las acciones y los tipos de entidad nuevos en sus filtros `accion` y `entidadTipo`.

## Escenarios (cubiertos por `tests/http/terminosYBajas.test.js`)

1. Sin términos publicados, `GET /terminos` da 404 y un proyecto se crea como hoy, con `terminos: null`.
2. Administración publica dos versiones: quedan 1 y 2, `GET /terminos` devuelve la 2 sin `publicadoPor`, y hay dos registros `TERMINOS_ACTUALIZADOS`.
3. El texto se sanitiza como Markdown: se va el `<script>` y queda `` `List<T>` ``.
4. Con términos vigentes, crear sin `terminosAceptados`, con otra versión o como borrador sin aceptarlos da 422 `TERMINOS_NO_ACEPTADOS` y no crea nada.
5. Aceptando la vigente, el dueño y administración ven `terminos.version`; el público no ve `terminos` ni `baja`.
6. Después de publicar la versión 2, el proyecto que aceptó la 1 se distingue del que aceptó la 2.
7. La baja de un proyecto lo deja `DADO_DE_BAJA`, finaliza sus colaboraciones, audita el motivo, y el colectivo lo ve en su listado y en el detalle con `baja.motivo`.
8. Un proyecto dado de baja no aparece en `GET /proyectos`, en el listado público del colectivo ni en las estadísticas; su detalle y sus sub-recursos dan 404 al público.
9. El colectivo ya no puede editarlo, pedir su publicación ni finalizarlo (409).
10. Dar de baja un proyecto en revisión descarta su revisión de publicación.
11. 409 si ya estaba dado de baja, 404 si no existe, 400 sin motivo o con id mal formado.
12. 401 sin sesión, 403 al líder, 422 `CONFLICTO_DE_INTERESES` a un administrador del colectivo.
13. Si falla la auditoría, el proyecto sigue abierto.
14. La baja de un colectivo reusa la existente (sus proyectos quedan `FINALIZADO` y el líder pierde el contexto) y audita `COLECTIVO_DADO_DE_BAJA`.
15. Las rutas nuevas responden 401 y 403 a todo lo que no sea un contexto de administración (tabla de `tests/http/administracion.test.js`).

Cubiertos por `tests/http/listadosDeBajas.test.js`:

16. `GET /administracion/proyectos` trae borradores, en revisión, abiertos y finalizados, y nunca los dados de baja; filtra por `estado` (400 con `DADO_DE_BAJA`), `q` (título o colectivo, sin tildes) y `etiqueta`, y pagina con `page` y `limit`.
17. `conflictoDeIntereses` es `true` solo en los proyectos de colectivos donde participa quien consulta.
18. 401 sin sesión y 403 `PERMISO_INSUFICIENTE` para un contexto de colectivo.
19. El dueño ve `baja` y `publicacion` en `GET /colectivos/:id/proyectos`, iguales a las del detalle (incluido el rechazo de una publicación); el público, otro colectivo y administración no las reciben.

## Fuera de alcance

- El front: aceptar los términos al crear un proyecto, mostrar el estado `DADO_DE_BAJA` y el motivo, y la pantalla de términos y bajas en `/admin`.
- Filtrar proyectos por versión de términos aceptada, y pedir que se vuelvan a aceptar los términos al publicar una versión nueva.
- Avisar por correo al colectivo cuando se da de baja un proyecto suyo.
- Reactivar un proyecto o un colectivo dado de baja.
- Ver el historial de versiones por API (queda en la base).
