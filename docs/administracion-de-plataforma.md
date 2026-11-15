# Administración de la plataforma: rol administrativo, auditoría, revisiones y destacados

Origen: adicionales 13, 18, 21, 29 y 35 del enunciado, que el README dejó para la tercera entrega porque necesitan saber quién usa la plataforma. Este documento diseña la base común y los dos primeros adicionales (18 y 35).

Estado: implementado en el back (14/11/2026) según el plan aprobado. Los tests unitarios y el lint pasan; los tests HTTP y de integración necesitan MongoDB y se corren con `npm test` en la máquina del equipo. El front queda para después.

## Intención

Hoy no existe nadie con autoridad sobre la plataforma: los únicos roles son `LIDER`, `MIEMBRO` y `COLABORADOR`, todos dentro de un colectivo o de un perfil. Los adicionales de administración (destacados, seguimiento, moderación, términos y condiciones, auditoría) necesitan tres piezas compartidas, que se diseñan una sola vez:

1. Un rol de administración de la plataforma.
2. Un registro de auditoría de las acciones administrativas.
3. Una cola de revisiones manuales.

Sobre esas piezas se implementan primero el panel de proyectos destacados (18) y el seguimiento de proyectos sin actualizaciones (35). Los demás (13 completo, 21, 29) y los futuros de moderación y denuncias reutilizan lo mismo.

Rol: administradores de la plataforma. Lectura pública solo de los destacados.

## Decisiones

1. La administración es un tercer tipo de contexto, `ADMINISTRACION`, con el rol `ADMIN`. Se carga en el catálogo con el seed, igual que los demás tipos, roles y permisos. Reusa `X-Context-Id`, `ContextoService.esValido` y el cambio de contexto. Una cuenta puede ser administradora y tener a la vez los otros contextos.
2. El rol no se obtiene por autoservicio (decisión A). Lo otorga un comando de administración del back (`npm run admin:otorgar -- <cuenta>`) y, una vez que existe al menos un administrador, un endpoint solo para administradores (`POST /administracion/administradores`, permiso `ADMIN_GESTIONAR`, audita `ADMIN_OTORGADO`). Ningún endpoint público ni «Mi cuenta» lo ofrece.
3. Auditoría desde la primera acción: toda operación administrativa que cambia datos escribe un registro de auditoría en la misma transacción. Sin registro, no hay cambio.
4. Las revisiones manuales viven en una colección propia (`revisiones`) con motivo, estado y resolución. La cola es genérica: hoy `SIN_ACTUALIZACIONES`; después denuncias e infracciones.
5. El vencimiento de un destacado se resuelve en la consulta (`hasta > ahora`), no con un job.
6. Conflicto de intereses, incluido desde el inicio (decisión D): un administrador que además es líder o miembro de un colectivo no puede destacar, revisar ni resolver sobre proyectos de ese colectivo (422 `CONFLICTO_DE_INTERESES`). Se verifica con tests.
7. Las acciones administrativas se prueban siempre en los dos sentidos: con rol (permitido) y sin rol, o con otro contexto (403).
8. Un administrador puede ser a la vez colaboradora con postulaciones (decisión F): el contexto `ADMINISTRACION` es independiente del de colaboradora y no restringe sus postulaciones.
9. Una revisión nueva no genera avisos: los administradores la ven en el listado (decisión E).

## Qué ya funciona y no se toca

- Roles y permisos: se arman desde `rolesYPermisos.js` y el seed, con `ROL`, `PERMISO` y `TIPO_CONTEXTO` como enums.
- Resolución del contexto del pedido (`X-Context-Id` debe ser el actual, si no 409 `CONTEXTO_NO_ACTUAL`) y las guardas por permiso.
- El job de cierre automático (`src/jobs/cierreAutomatico.js`) y `tareaPeriodica.js`: el seguimiento (35) se monta igual.
- Avances y logros del proyecto: son lo que cuenta como «actualización».

## Modelo

### Contexto y permisos

- `TIPO_CONTEXTO.ADMINISTRACION` y `ROL.ADMIN`. El contexto no apunta a un colectivo ni a una colaboradora: el invariante pasa a «cada contexto apunta a un colectivo, a una colaboradora o a ninguno (administración)». Una cuenta tiene como máximo un contexto activo de administración.
- Permisos nuevos (todos del rol `ADMIN`): `PROYECTO_DESTACAR`, `REVISION_VER`, `REVISION_RESOLVER`, `AUDITORIA_VER`, `ADMIN_GESTIONAR`.
- `/auth/me` lista el contexto de administración como cualquier otro. Los listados de contextos y «Mi cuenta» del front deben contemplar el tercer tipo (ver Fuera de alcance).

### Auditoría

Colección `acciones_administrativas`, solo se agregan registros:

| Campo                     | Contenido                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `usuarioId`, `contextoId` | Quién actuó y con qué contexto                                                                                |
| `accion`                  | Código, por ejemplo `PROYECTO_DESTACADO`, `PROYECTO_DESTACADO_QUITADO`, `REVISION_RESUELTA`, `ADMIN_OTORGADO` |
| `entidad`                 | `{ tipo, id }` de lo afectado                                                                                 |
| `detalle`                 | Datos útiles y acotados (motivo, vencimiento, resolución), sin datos personales                               |
| `fecha`                   | Cuándo                                                                                                        |

`GET /administracion/auditoria`, paginado y filtrable por acción, entidad y fecha, con `AUDITORIA_VER`.

### Revisiones (adicional 35)

Colección `revisiones`:

| Campo                               | Contenido                                   |
| ----------------------------------- | ------------------------------------------- |
| `proyectoId`                        | Proyecto marcado                            |
| `motivo`                            | `SIN_ACTUALIZACIONES` (más adelante, otros) |
| `estado`                            | `PENDIENTE`, `REVISADA`, `DESCARTADA`       |
| `creadaEn`                          | Cuándo se marcó                             |
| `resueltaPor`, `resueltaEn`, `nota` | Quién y cuándo la resolvió                  |

- Índice único parcial sobre `(proyectoId, motivo)` cuando `estado = PENDIENTE`: el job puede correr varias veces sin duplicar.
- Un proyecto «iniciado» es uno abierto con al menos una colaboración aceptada. «Sin actualizaciones» es no tener avances ni logros nuevos en los últimos `DIAS_SIN_ACTUALIZACIONES` (configurable, por defecto 30), contados desde el último avance, logro o aceptación.
- El job (`src/jobs/seguimiento.js`, con `tareaPeriodica`) corre con su propia cadencia configurable (`SEGUIMIENTO_INTERVALO_MS`, por defecto una hora: el plazo se mide en días) y es idempotente.
- Una revisión resuelta no se vuelve a crear hasta que pase otro período completo sin actualizaciones.
- Rutas: `GET /administracion/revisiones` (filtro por estado y motivo, paginado) y `POST /administracion/revisiones/:id/resolucion` (`{ estado: REVISADA|DESCARTADA, nota }`). Cada resolución audita.

### Destacados (adicional 18)

Campo en el proyecto: `destacado: { desde, hasta, marcadoPor }` o ausente.

- Solo se puede destacar un proyecto abierto y de un colectivo activo (los proyectos no tienen un campo de visibilidad: todos son públicos); si no, 422. Si el proyecto se finaliza o el colectivo se da de baja, deja de estar vigente aunque no haya vencido.
- `hasta` es obligatorio y debe ser futuro. Máximo `MAX_DESTACADOS_ACTIVOS` activos a la vez (configurable, por defecto 6); si se supera, 409.
- Un destacado está vigente cuando `desde <= ahora < hasta`.
- Rotación: el endpoint de portada devuelve los vigentes ordenados por el que menos tiempo lleva destacado y, ante empate, por el que vence antes. Cuando uno vence deja de listarse solo; el administrador puede reemplazarlo.
- Rutas: `PUT /administracion/proyectos/:id/destacado` (`{ hasta }`), `DELETE` del mismo recurso, `GET /proyectos/destacados` (público), y los listados públicos de proyectos ordenan los vigentes primero y los marcan con `destacado: true`.
- Se audita cada alta, cambio y baja.

## Escenarios

1. Un administrador destaca un proyecto abierto y público hasta una fecha futura: aparece primero en el listado y en `/proyectos/destacados`, con registro de auditoría.
2. Al pasar la fecha, el proyecto deja de listarse como destacado sin ninguna intervención.
3. Destacar un proyecto finalizado, de un colectivo dado de baja o con fecha pasada da 422.
4. El séptimo destacado vigente da 409; quitar uno lo permite.
5. Un `LIDER` o `MIEMBRO` que no es administrador, y una colaboradora, reciben 403 en todas las rutas de administración.
6. Una cuenta administradora y líder de un colectivo no puede destacar ni resolver revisiones de proyectos de ese colectivo (422 `CONFLICTO_DE_INTERESES`).
7. El job marca un proyecto abierto con colaboraciones aceptadas y sin avances en 30 días: aparece una revisión `PENDIENTE`. Correrlo otra vez no la duplica.
8. Un nuevo avance en un proyecto marcado no resuelve la revisión sola: la resuelve un administrador.
9. Resolver una revisión como `REVISADA` o `DESCARTADA` registra autor y fecha; resolverla dos veces da 409.
10. Cada acción administrativa deja un registro de auditoría consultable con `GET /administracion/auditoria`.
11. El comando `admin:otorgar` crea el contexto `ADMINISTRACION` de una cuenta existente; repetirlo no duplica (409 o sin cambios).
12. Una cuenta con los tres tipos de contexto cambia entre ellos y cada pedido opera solo con el que indica `X-Context-Id`.
13. Una cuenta administradora con perfil de colaboradora se postula a un proyecto desde su contexto de colaboradora; desde el de administración recibe 403 en las rutas de postulación (decisión F).
14. Crear una revisión no envía notificaciones ni correos (decisión E).

## Requisitos

- Toda ruta `/administracion/**` exige sesión y el permiso correspondiente del contexto actual.
- Ninguna acción administrativa cambia datos sin dejar auditoría en la misma transacción.
- Los textos que ingresa un administrador (`nota`) se sanitizan como el resto.
- El rol de administración no cambia los permisos ni el alcance de los otros roles.
- Los listados públicos no exponen quién destacó ni la nota de una revisión.

## Estados

- Revisión: `PENDIENTE` → `REVISADA` o `DESCARTADA` (final).
- Destacado: ausente → vigente → vencido (derivado) o quitado.

## Decisiones cerradas

- A. Rol: comando `admin:otorgar` más endpoint para administradores (ver decisión 2).
- B. Valores por defecto: `DIAS_SIN_ACTUALIZACIONES = 30` y `MAX_DESTACADOS_ACTIVOS = 6`, ambos configurables por entorno.
- C. «Iniciado»: proyecto abierto con al menos una colaboración aceptada.
- D. Conflicto de intereses: se implementa desde el inicio (decisión 6).
- E. Aviso de una revisión nueva: solo el listado, sin correo.
- F. Un administrador puede ser también colaboradora con postulaciones.

## Plan de implementación (back primero, con tests)

Cada paso empieza por tests que fallan y termina con el código mínimo que los pone en verde. El árbol de trabajo ya tiene cambios sin commitear ajenos a esta tarea; no se tocan ni se commitea.

1. Rol y contexto de administración.
   - Tests: `tests/unit` (`problemaDeConsistencia`, `ROLES_POR_TIPO`), `tests/http/administracion.test.js` (escenarios 11, 12 y 13) y un test de integración del validador `$jsonSchema` y del índice único del contexto activo de administración.
   - Código: `TIPO_CONTEXTO.ADMINISTRACION`, `ROL.ADMIN` y los permisos nuevos en `enums/`; `rolesYPermisos.js` (tipos, descripciones, rol y `ROLES_POR_TIPO`); `ContextoUsuarioModel` (contexto sin colectivo ni colaboradora, índice parcial de un contexto activo por usuario); `validadoresDeColecciones.js` (tercera variante); `ContextoService.esValido`, `contexto.js`, `cuentaDto.js` y `MongoContextoUsuarioRepository`; `scripts/otorgarAdmin.js` y el script `admin:otorgar`.
2. Auditoría.
   - Tests: servicio (registro dentro de la transacción, rollback si falla), `GET /administracion/auditoria` con filtros, paginación y 403.
   - Código: `AccionAdministrativaModel`, repositorio, `AuditoriaService`, controller, ruta y OpenAPI.
3. Administradores.
   - Tests: `POST /administracion/administradores` (permitido, 403, repetido sin duplicar, audita `ADMIN_OTORGADO`).
   - Código: servicio y ruta, reusando el alta de contexto del paso 1.
4. Revisiones (adicional 35).
   - Tests unitarios de las reglas (iniciado, sin actualizaciones, idempotencia, nueva revisión tras resolver); integración del índice único parcial y del job; HTTP de los escenarios 7, 8, 9 y 14.
   - Código: `reglasDeSeguimiento.js` (puras), `RevisionModel`, repositorio, `RevisionService`, `src/jobs/seguimiento.js` con `tareaPeriodica`, variable `SEGUIMIENTO_INTERVALO_MS` y `DIAS_SIN_ACTUALIZACIONES`, rutas, cableado en `composicion.js` y `index.js` (con apagado ordenado).
5. Destacados (adicional 18).
   - Tests unitarios de vigencia, tope y elegibilidad; HTTP de los escenarios 1 a 4, con orden y marca en los listados y `/proyectos/destacados`.
   - Código: campo `destacado` en `ProyectoModel`, `reglasDeDestacado.js`, `DestacadoService`, rutas, orden de los listados públicos y variable `MAX_DESTACADOS_ACTIVOS`.
6. Conflicto de intereses (escenario 6).
   - Tests: un administrador que es líder o miembro del colectivo recibe 422 al destacar y al resolver revisiones; en otro colectivo, no.
   - Código: una regla compartida, usada por los servicios de destacados y revisiones.
7. Permisos transversales.
   - Tests: tabla de todas las rutas `/administracion/**` contra `LIDER`, `MIEMBRO`, `COLABORADOR` y sin contexto (escenario 5).
8. Documentación y cierre.
   - README (mapa de la API, variables de entorno, comando), OpenAPI y esta spec.
   - `npm test` completo (el proyecto «unit» corre sin base; el «mongo» necesita MongoDB) y `npm run lint`. Sin commits.

## Fuera de alcance

- El front: sello «Destacado» y orden en la portada y el listado (fase 1); selector de contexto y «Mi cuenta» con el tercer tipo, y el área `/admin` con destacados, revisiones y auditoría (fase 2). Se hace después, en el repo del front, con su propia spec.
- Los adicionales 21 (términos y condiciones) y 29 (borradores), y moderación y denuncias; se apoyan en esta base y en la cola de revisiones.
- Notificaciones a administradores por correo (decisión E: solo el listado).
- Roles intermedios (`MODERADOR`).

## Criterio de aceptación

- Existe el contexto y rol de administración, solo otorgables por el comando o por un administrador, y las rutas `/administracion/**` responden 403 a cualquier otro contexto.
- Se puede destacar un proyecto elegible con vencimiento, se respeta el tope, el destacado aparece primero en los listados y en `/proyectos/destacados`, y vence solo.
- El job marca los proyectos iniciados sin actualizaciones sin duplicar, y un administrador puede listarlos y resolverlos.
- Toda acción administrativa queda en la auditoría con autor y fecha, en la misma transacción que el cambio.
- Los tests de los escenarios pasan y no se rompe ninguna suite existente.
- Sin commits.

## Variables de entorno

| Variable                   | Por defecto | Qué hace                                                          |
| -------------------------- | ----------- | ----------------------------------------------------------------- |
| `DIAS_SIN_ACTUALIZACIONES` | 30          | Plazo sin avances, logros ni aceptaciones para abrir una revisión |
| `MAX_DESTACADOS_ACTIVOS`   | 6           | Tope de destacados vigentes                                       |
| `SEGUIMIENTO_INTERVALO_MS` | 3600000     | Cadencia del job de seguimiento                                   |

## Notas de implementación

- La serialización del tope de destacados usa un documento de control (`controles`) que cada alta o baja de destacado incrementa dentro de su transacción: dos pedidos simultáneos no pueden superar el máximo.
- Quitar un destacado también exige no tener conflicto de intereses con el colectivo.
- Las acciones hechas por el comando `admin:otorgar` se auditan sin autor (`usuarioId` y `contextoId` nulos) y con `detalle.origen = COMANDO`.
- Una revisión resuelta bloquea una nueva hasta que pase un período completo contado desde su resolución.
