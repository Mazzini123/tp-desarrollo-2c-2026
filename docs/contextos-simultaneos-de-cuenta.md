# Contextos de colectivo y de colaboradora en una misma cuenta

Origen: decisiones del equipo del 14/11/2026 (ver "Decisiones aprobadas"). Modelo de referencia: el SIU, donde una misma cuenta cambia de tipo sin volver a ingresar.

Estado: decisiones cerradas el 14/11/2026. Falta aprobar el plan de implementación; no se implementó nada todavía.

## Intención

Hoy `ContextoService.exigirSinModalidad` impide, a nivel de cuenta, tener contextos activos de los dos tipos (`MODALIDAD_INCOMPATIBLE`). Esa regla la pidió el equipo con otro propósito: limitar qué operaciones puede hacer cada tipo de contexto. Lo que se busca ahora, según el modelo del equipo (un usuario con un contexto de colaboradora y 0..N contextos de colectivo distintos), es que una cuenta pueda tener a la vez 0..1 contexto de colaboradora y 0..N contextos de colectivo distintos (como líder o miembro), de forma independiente: puede tener contextos de colectivo sin tener el de colaboradora, y al revés, y cambiar entre ellos con `PUT /auth/contexto-actual` sin volver a ingresar. Cada pedido sigue operando en un solo contexto, el que indica `X-Context-Id`.

Rol: cualquier persona con cuenta.

## Decisiones aprobadas

1. Regla nueva: una cuenta no puede postularse a proyectos de un colectivo donde participa (como líder o miembro).
2. Mensajes, postulaciones y notificaciones siguen yendo por contexto, sin cruzarse. Se verifica con tests.
3. Dar de baja un perfil no arrastra los otros contextos de la cuenta.
4. Se mantiene el invariante del contexto: cada contexto apunta a un colectivo o a una colaboradora, nunca a los dos, y una cuenta tiene como máximo un contexto activo de colaboradora (`PERFIL_COLABORADOR_EXISTENTE`). Un usuario no puede tener dos contextos del mismo colectivo. Varios colectivos distintos ya se permiten.
5. El cambio de contexto solo setea el contexto actual elegido entre los que la cuenta tiene, también al volver a ingresar con un contexto actual ya guardado (ya funciona así en `ContextoService.seleccionar`; se cubre con un test).
6. Crear un perfil de colaboradora o un colectivo es una operación de la cuenta y no depende del contexto actual (pregunta F, opción 1, confirmada por el equipo). El contexto actual solo limita las operaciones dentro de su tipo, y eso ya lo hacen los permisos del rol.
7. Crear un contexto nuevo no modifica los contextos que la cuenta ya tiene: los contextos se tratan como inmutables.
8. Se sacan las cuatro llamadas a `exigirSinModalidad` (`ModalidadService.crearPerfilColaborador` y `ModalidadService.crearColectivo`; `MembresiaService.solicitarIngreso` y `MembresiaService.aceptar`), confirmado por el equipo. Se mantienen la validación del contexto (cada contexto es de un solo tipo) y `PERFIL_COLABORADOR_EXISTENTE`. La opción de reemplazarlo por una validación sobre el contexto actual queda descartada porque la creación no depende del contexto actual.
9. El trabajo se hace en una rama aparte (`feature/contextos-simultaneos`), para que la rama actual siga siendo el entregable del TP si el cambio causa problemas.
10. Pregunta B resuelta (opción 1+2, confirmada por el equipo). Entrar a un colectivo no bloquea ni cancela postulaciones anteriores, pero ningún contexto de colectivo de la cuenta puede actuar sobre una colaboración de su propio perfil de colaboradora: aceptar, rechazar, finalizar, desvincular y valorar como colectivo responden 422 `COLABORACION_PROPIA`. Como colaboradora (finalizar, desvincular, valorar como colaborador) sigue permitido, y ver los datos de contacto no se bloquea.

## Qué ya funciona y no se toca

- El contexto del pedido se resuelve por `X-Context-Id` y debe ser el contexto actual de la cuenta (`ContextoService.resolverEnPedido`); si no, 409 `CONTEXTO_NO_ACTUAL`.
- Las guardas comparan contra el contexto del pedido: `colaboradoraDe`, `colaboradoraDelBody`, `duenoDelProyecto`, `participanteDeLaColaboracion`, `autorDeLaValoracion`.
- Las notificaciones pertenecen al perfil de colaboradora (`destinatarioId`), no a la cuenta.
- El índice único `colaborador_activo_por_usuario` sostiene `PERFIL_COLABORADOR_EXISTENTE` aun con alta concurrente.
- La baja de colaboradora desactiva solo su contexto y limpia el contexto actual únicamente si era ese; la baja de colectivo desactiva solo los contextos de ese colectivo.

## Escenarios

Dado una cuenta con contexto de colectivo,
cuando crea su perfil de colaboradora,
entonces responde 201, el contexto de colaboradora pasa a ser el actual y el de colectivo sigue activo.

Dado una cuenta con perfil de colaboradora,
cuando crea un colectivo,
entonces responde 201, es líder del nuevo colectivo y el perfil de colaboradora sigue activo.

Dado una cuenta con perfil de colaboradora activo,
cuando intenta crear otro perfil de colaboradora (también dos a la vez),
entonces uno solo se crea y el otro responde 409 `PERFIL_COLABORADOR_EXISTENTE`.

Dado una cuenta sin perfil de colaboradora,
cuando crea un colectivo y se une como miembro a otro distinto,
entonces tiene dos contextos de colectivo y no se le exige crear un perfil de colaboradora; y una cuenta con solo perfil de colaboradora no necesita ningún contexto de colectivo.

Dado una cuenta con perfil de colaboradora,
cuando pide ingresar a un colectivo y el líder acepta,
entonces la cuenta suma un contexto MIEMBRO sin cambiar su contexto actual.

Dado una cuenta con varios contextos,
cuando selecciona otro con `PUT /auth/contexto-actual`,
entonces los pedidos siguientes con ese `X-Context-Id` operan en él; un pedido con el id de otro contexto responde 409 `CONTEXTO_NO_ACTUAL`.

Dado una cuenta que es líder o miembro activo del colectivo C,
cuando su perfil de colaboradora se postula a un proyecto de C,
entonces responde 422 `POSTULACION_EN_COLECTIVO_PROPIO` y no se crea la postulación.

Dado una cuenta que salió de C (contexto inactivo) o que nunca participó en C,
cuando su perfil de colaboradora se postula a un proyecto de C,
entonces la postulación se crea (201).

Dado una cuenta con perfil de colaboradora y colectivo propio,
cuando la colaboradora se postula a un proyecto de otro colectivo,
entonces la postulación aparece en las colaboraciones de su perfil de colaboradora y no en las postulaciones recibidas de su colectivo.

Dado una cuenta con perfil de colaboradora y colectivo propio,
cuando opera con el contexto de colectivo,
entonces `POST /proyectos/:id/colaboraciones`, `GET /colaboradores/:id/notificaciones`, la lectura de notificaciones y `proyectos-potenciales` responden 403; y con el contexto de colaboradora responden 403 invitar, aceptar, rechazar y ver postulaciones recibidas de su colectivo.

Dado un colectivo que invita a una colaboradora (mensaje interno) y que acepta o rechaza una postulación,
cuando la colaboradora es de una cuenta que también tiene contexto de colectivo,
entonces la invitación y los avisos de resolución se ven solo en las notificaciones del perfil de colaboradora, nunca en otro contexto de la cuenta.

Dado una cuenta con perfil de colaboradora, un colectivo propio y una membresía,
cuando da de baja el perfil de colaboradora,
entonces los contextos de colectivo y de membresía siguen activos y seleccionables, y el contexto actual cambia solo si era el de colaboradora (queda en null).

Dado un colectivo con varios integrantes que además tienen perfil de colaboradora,
cuando el colectivo se da de baja,
entonces se desactivan solo los contextos de ese colectivo; los perfiles de colaboradora y los demás colectivos de cada integrante siguen activos.

Dado una cuenta que se postula a un proyecto de C mientras el líder de C acepta su solicitud de ingreso,
cuando ambas operaciones corren a la vez,
entonces se serializan: o la postulación queda creada antes del ingreso, o se rechaza con 422; nunca fallan por un estado intermedio.

## Requisitos

- `MembresiaService.solicitarIngreso`/`aceptar` y `ModalidadService.crearPerfilColaborador`/`crearColectivo` no llaman a `exigirSinModalidad`; mantienen sus bloqueos de usuario y de colectivo.
- `ModalidadService.crearPerfilColaborador` mantiene la verificación y el 409 `PERFIL_COLABORADOR_EXISTENTE`.
- Se elimina `ContextoService.exigirSinModalidad`, que queda sin usos (a confirmar, pregunta D).
- `ColaboracionService.registrar` aplica la regla nueva dentro de su transacción: busca el contexto de la colaboradora (`contextoUsuarioRepository.buscarDeColaborador`), bloquea al usuario (`usuarioRepository.bloquear`, la misma escritura de control que usan las altas y la aceptación de ingresos) y rechaza si el usuario tiene un contexto activo (`buscarDeUsuarioEnColectivo`) en el colectivo del proyecto.
- Una colaboradora sin contexto asociado (modo sin autenticación) no se ve afectada por la regla.
- La regla se informa como `DomainError` (422) con código `POSTULACION_EN_COLECTIVO_PROPIO` y mensaje en lenguaje de la persona (pregunta C).
- `composicion.js` inyecta `contextoUsuarioRepository` y `usuarioRepository` en `ColaboracionService`.
- Ningún endpoint cambia de forma ni de permisos; solo desaparece `MODALIDAD_INCOMPATIBLE` de las respuestas posibles.
- Se actualizan el README (autenticación y exclusividad de modalidades) y la descripción de errores de OpenAPI (`docs/openapi/comunes.js`).
- No hay migración: la exclusión nunca se guardó, era solo validación.

## Estados

Sin pantallas. Respuestas HTTP que cambian o se agregan:

- Cargando: no aplica.
- Con datos: crear colaboradora/colectivo y pedir/aceptar ingreso responden como antes (201/200) aunque la cuenta tenga el otro tipo de contexto.
- Vacío: no aplica.
- Sin resultados: no aplica.
- Error: 422 `POSTULACION_EN_COLECTIVO_PROPIO` y 422 `COLABORACION_PROPIA` (nuevos); 409 `PERFIL_COLABORADOR_EXISTENTE` (se mantiene); 403 `PERMISO_INSUFICIENTE` y 409 `CONTEXTO_NO_ACTUAL` (sin cambios); `MODALIDAD_INCOMPATIBLE` deja de existir.

## Preguntas abiertas

- F (resuelta: opción 1). Desde qué estado se crean los contextos. Hoy crear un perfil de colaboradora o un colectivo es una operación de la cuenta (no usa el contexto actual). Opción 1 (recomendada): se mantiene así; el contexto actual solo limita las operaciones dentro de su tipo, que ya lo hacen los permisos del rol. Opción 2: crear exige no tener contexto actual o que sea de cierto tipo, lo que impide que una cuenta con solo perfil de colaboradora cree su primer colectivo sin pasar antes por un estado sin contexto actual. Pedir ingreso y aceptar ingreso no dependen del contexto actual (usan al usuario sin `X-Context-Id`).

Los puntos A y B no estaban en las decisiones aprobadas. Quedan fuera del alcance hasta que se confirmen; la recomendación es la primera opción.

- A. Cruces por búsquedas y avisos. Con una cuenta dual, la colaboradora de la cuenta puede aparecer en `colaboradoras-potenciales` y recibir una invitación o el aviso "proyecto nuevo para vos" de un proyecto de su propio colectivo, al que no puede postularse. Recomendación: excluirla en `buscarColaboradoras`, rechazar la invitación con el mismo 422 y excluir esos proyectos de `proyectos-potenciales` y de los avisos automáticos. Costo: cambios en los repositorios de colaboradoras y de proyectos.
- B (resuelta: opción 1+2, ver decisión 10). Postulaciones anteriores. Si una persona ya tiene postulaciones a proyectos de C y luego entra a C, la regla nueva solo impide postulaciones nuevas. Recomendación: dejarlas como están, sin bloquear ni cancelar el ingreso.
- C. Código y status del error nuevo: 422 con `POSTULACION_EN_COLECTIVO_PROPIO` (regla de negocio, como la de habilidades requeridas). La alternativa es 409.
- D. Borrar `CODIGO_ERROR.MODALIDAD_INCOMPATIBLE` y `exigirSinModalidad`. El front los referencia en `CODIGO_ERROR.js`, `mensajesDeError.js`, `Formatos/membresia.js` y `registroObligatorio.test.jsx`; esa limpieza queda para la tarea del front.
- E. Después de dar de baja el perfil, si era el contexto actual, queda `contextoActual: null` aunque la cuenta tenga otros contextos. Recomendación: mantenerlo; el front ya lleva a Bienvenida (spec 15 del front).

## Plan de implementación (back primero, con tests)

1. Tests que fallan primero, en `tests/unit/servicios/ColaboracionService.test.js`: la regla nueva con dobles (líder, miembro, ex-miembro, otro colectivo, sin contexto).
2. Tests HTTP en un archivo nuevo, `tests/http/contextosSimultaneos.test.js`: cuenta dual, cambio de contexto, separación de postulaciones, mensajes y notificaciones por contexto, y baja que no arrastra contextos.
3. Actualizar los tests que hoy afirman la exclusión: `tests/http/contextosYMembresias.test.js` (el bloque "modalidades" y el alta tras la baja), `tests/http/autenticacion.test.js` (línea 109) y `tests/integracion/contextosYTransacciones.test.js` (alta concurrente de modalidades opuestas y aceptación de quien pasó a colaboradora).
4. Test de integración de concurrencia: postularse mientras se acepta el ingreso al colectivo del proyecto.
5. Código: quitar las cuatro llamadas, agregar la regla en `ColaboracionService.registrar`, cablear en `composicion.js`, eliminar lo que quede sin uso.
6. README y OpenAPI.
7. Cierre: `npm test` completo en verde (el proyecto "unit" corre sin base; los del proyecto "mongo" requieren MongoDB) y `npm run lint` si el repo lo tiene.

## Fuera de alcance

- El front (selector de contexto, textos de error, limpieza de `MODALIDAD_INCOMPATIBLE`): se hace después, en el repo del front.
- Elegir automáticamente otro contexto tras una baja.
- Límites de cantidad de colectivos por cuenta.
- Cambios de permisos o de roles.

## Criterio de aceptación

- Una cuenta puede tener 0..1 perfil de colaboradora y 0..N contextos de colectivo, de forma independiente (con uno, con otro, con ambos o con ninguno), y cambiar entre ellos; un segundo perfil de colaboradora sigue dando 409 `PERFIL_COLABORADOR_EXISTENTE`.
- Una cuenta no puede postularse a un proyecto de un colectivo donde participa (422), y sí a los demás.
- Los tests de la sección Escenarios pasan e incluyen la separación de mensajes, postulaciones y notificaciones por contexto y la baja que conserva los otros contextos.
- No queda ninguna referencia a `exigirSinModalidad` ni a `MODALIDAD_INCOMPATIBLE` en el back (según la respuesta a D).
- Sin commits.
