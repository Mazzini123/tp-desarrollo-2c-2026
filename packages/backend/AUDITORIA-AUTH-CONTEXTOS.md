# Auditoría del backend de autenticación y contextos

Rama `feature/auth-contextos`. Base de comparación `e16c1eb`. Las rutas de las tablas son relativas a `packages/backend`, salvo los archivos de raíz indicados.

## A. Problemas encontrados

| Ubicación anterior | Problema y decisión afectada | Consecuencia |
| --- | --- | --- |
| `src/domain/rolesYPermisos.js`, `CatalogoDeRoles.js`, `contexto.js` y enums | El dominio alojaba identidad contextual y autorización. Los modelos y repositorios de seguridad compartían directorios con los del negocio. | Los cambios de seguridad parecían cambios de dominio y dificultaban controlar la dirección de las dependencias. |
| `src/services/RegistroService.js:7` y `src/repositories/MongoIdentidadExternaRepository.js:9` | Identidad y usuario se guardaban por separado. El repositorio releía al recibir una clave duplicada, algo que resulta incorrecto si MongoDB ya abortó la transacción. | Un fallo podía dejar una identidad huérfana. Una recuperación dentro de una transacción abortada tampoco garantiza un registro concurrente consistente. |
| `src/auth/configuracionAuth.js:39` y `:68` | La validación comprobaba presencia de campos, con poca validación de forma y algoritmos. `AUTH_DESACTIVADA=true` permitía iniciar sin proveedor en producción. | Configuraciones ambiguas o incompletas podían detectarse tarde. Un despliegue directo podía arrancar sin autenticación. |
| `src/middlewares/autenticacion.js:1` y `src/auth/ValidadorOidcJwt.js` | M1 confundía la ausencia de credencial con un encabezado mal formado y podía aceptar texto adicional. El validador confiaba en la presencia de ciertos claims sin comprobar todos sus valores. | Una lectura pública podía degradar una solicitud con credencial inválida a anónima. Un `sub` vacío podía alcanzar la identificación interna. |
| `src/middlewares/identificacion.js:10`, rutas `/auth/me` y de alta | M2 podía registrar y omitir el nombre al activar la compatibilidad contextual. | Un GET podía escribir usuarios y la opción de compatibilidad alteraba precondiciones ajenas al header. |
| `src/services/ContextoService.js:35` y `:126` | M3 verificaba el colectivo asociado pero para colaboradora solo comprobaba el flag del contexto. Seleccionar contexto y desactivarlo podían intercalarse sin compartir una escritura. | Se podía operar con un perfil asociado dado de baja o inexistente. Una selección concurrente podía volver a apuntar a un contexto desactivado. |
| `src/services/ModalidadService.js:81` y `src/services/ColaboracionService.js:36` | La comprobación de actividad de la colaboradora ocurría antes de la transacción y el alta de una postulación escribía documentos distintos. | La baja y una nueva postulación podían confirmarse dejando actividad en un perfil dado de baja. |
| `src/services/MembresiaService.js:230`, `src/services/ColectivoService.js:135` y `src/repositories/MongoProyectoRepository.js:25` | Se daba de baja el colectivo y se cerraban proyectos antes de la transacción de membresías. Las escrituras en proyecto y colaboraciones podían confirmarse por separado. Publicación y solicitud no compartían una escritura con la baja. | Una falla intermedia podía dejar baja parcial y avisos encolados. Operaciones concurrentes podían dejar un proyecto abierto o una solicitud pendiente en un colectivo inactivo. |
| `src/services/MembresiaService.js:65` y `:143` | Alta y aceptación de solicitudes comprobaban el colectivo fuera de su transacción. La habilitación de una membresía sobrescribía el rol de cualquier contexto coincidente. | Una decisión concurrente podía usar datos vencidos o degradar una membresía activa al procesar una solicitud que ya no correspondía. |
| `src/models/ContextoUsuarioModel.js:89` y `:98`, `src/models/validadoresDeColecciones.js:22` y `index.js` | MongoDB permitía omitir el campo que debía ser nulo. El arranque toleraba un fallo en `collMod` y dependía de los índices automáticos. | Una escritura directa podía violar la estructura del contexto. La API podía aceptar tráfico sin haber garantizado restricciones únicas. |
| `src/migraciones/ejecutarMigraciones.js:2` y `:7`, `src/models/ColaboradorModel.js:11` y `:41`, `src/models/ColectivoModel.js:12` | La migración 001 y los campos `cuentaId` seguían en el camino de inicialización. | El arranque mantenía una dependencia del formato de cuentas anterior, que quedó fuera de la base inicial del TP. |
| `src/domain/rolesYPermisos.js` y README anterior | La documentación presentaba todos los permisos actuales como aprobados. | La matriz implementada podía confundirse con una decisión funcional cerrada. |

Ya estaban presentes el vínculo por `proveedor` y `sub`, la separación de nombres, la selección de OIDC por emisor, la autorización por permiso declarado, el contexto actual global, la membresía como contexto y el índice parcial de liderazgo. Se conservaron y se comprobó su comportamiento con HTTP y MongoDB.

## B. Cambios realizados

| Responsabilidad | Inventario |
| --- | --- |
| Seguridad y catálogos | Se trasladaron a `src/security/autorizacion/` `CatalogoDeRoles.js`, `rolesYPermisos.js` y `enums/{PERMISO,ROL,TIPO_CONTEXTO}.js`. `catalogosSeed.js` pasó de `src/seed` a `src/security`. |
| Proveedores | `src/auth/{configuracionAuth,RegistroDeProveedores,ValidadorOidcJwt}.js` pasó a `src/security/auth/`. Se creó allí `erroresDeAutenticacion.js` para compartir errores sin que HTTP dependa del adaptador JWT. |
| HTTP de seguridad | `autenticacion.js`, `identificacion.js` y `autorizarEnContexto.js` pasaron de `src/middlewares` a `src/security/http`, junto con `contexto.js` y `ROL_CUENTA.js` desde `src/domain`. Se actualizó `src/middlewares/autorizacion.js` para componerlos con las guardas de recurso y la precondición de nombre. |
| Aplicación | `ContextoService.js`, `RegistroService.js` y `LiderazgoService.js` pasaron de `src/services` a `src/security/application`, que también recibió `ESTADO_SOLICITUD.js`. `ModalidadService.js` y `MembresiaService.js` pasaron a `src/application` como orquestadores. |
| Persistencia de seguridad | Se movieron a `src/security/persistencia/` `ContextoUsuarioModel.js`, `IdentidadExternaModel.js`, `SolicitudIngresoModel.js`, `UsuarioModel.js`, `catalogos.js`, `validadoresDeColecciones.js` y los repositorios `MongoCatalogoRepository.js`, `MongoContextoUsuarioRepository.js`, `MongoIdentidadExternaRepository.js`, `MongoSolicitudIngresoRepository.js` y `MongoUsuarioRepository.js`. |
| Negocio y consistencia | Se modificaron `src/services/{ColaboracionService,ColaboradorService,ColectivoService,PerfilService,ProyectoService,reglasDePostulacion}.js` y `src/repositories/{MongoColaboradorRepository,MongoColectivoRepository,MongoProyectoRepository}.js`. Comparten la transacción en las escrituras coordinadas y el control de concurrencia por documento. |
| Arranque y migraciones | Se modificaron `index.js`, `src/composicion.js`, `src/config/{db,transacciones}.js`, `src/migraciones/ejecutarMigraciones.js` y `src/models/{ColaboradorModel,ColectivoModel}.js`. Se eliminó `src/migraciones/001-cuentasAContextos.js`, su caso de prueba exclusivo y las definiciones de `cuentaId`. Las migraciones 002 y 003 siguen registradas. Se creó `src/migraciones/004-indiceDeColaboradorActivo.js` para reemplazar el índice anterior una vez asegurado el nuevo. |
| Contrato HTTP | Se actualizaron `src/controllers/{ColaboradorController,ColectivoController,CuentaController,PostulacionController,ProyectoController}.js`, `src/routes/{colaboradoresRouter,colectivosRouter,cuentaRouter,proyectosRouter}.js` y `src/schemas/cuentaSchema.js`. Las rutas, los identificadores y las formas de respuesta existentes se conservaron. Los consumidores del registro implícito pasan a registrar antes de consultar `/auth/me` o dar de alta una modalidad. |
| Despliegue y documentación | `README.md`, `.env.prod.example`, `docker-compose.yml` y `docker-compose.prod.yml` de raíz, `.env.example` del backend, `src/docs/openapi/rutas/{colaboradores,colectivos,cuenta}.js` y este informe. |
| Pruebas | `tests/auth/validacionDeTokens.test.js`, `tests/domain/CatalogoDeRoles.test.js`, `tests/http/{app,autenticacion,bajaYSesion,contextosYMembresias,visibilidadYAvisos,vistasPublicas}.js` (las suites usan el sufijo `.test.js`) y `tests/integracion/{concurrencia,contextosYTransacciones}.test.js`. |

## C. Decisiones sobre permisos y reactivación

### Matriz final de permisos

| Estado y rol con acceso | Operaciones y permisos |
| --- | --- |
| Solo LIDER | Baja lógica del colectivo (`COLECTIVO_ELIMINAR`), aceptar y rechazar ingresos (`MEMBRESIA_SOLICITUD_RESOLVER`), quitar miembros (`MIEMBRO_ELIMINAR`) y transferir el liderazgo (`LIDER_ASIGNAR`). |
| Solo LIDER | Editar el colectivo (`COLECTIVO_EDITAR`) y gestionar sus contactos (`COLECTIVO_CONTACTO_GESTIONAR`). |
| MIEMBRO y LIDER | Consultar el listado de miembros del colectivo del contexto actual (`COLECTIVO_MIEMBROS_VER`). |
| MIEMBRO y LIDER | Consultar solicitudes (`COLECTIVO_MIEMBROS_VER`), consultar estadísticas (`COLECTIVO_ESTADISTICAS_VER`), crear, editar y finalizar proyectos (`PROYECTO_CREAR`, `PROYECTO_EDITAR`, `PROYECTO_FINALIZAR`), gestionar reclutamiento y postulaciones de proyecto (`RECLUTAMIENTO_GESTIONAR`, `POSTULACION_RESOLVER`), y ver el contacto de colaboradoras según las reglas del proyecto (`CONTACTO_COLABORADORA_VER`). |
| COLABORADOR, MIEMBRO y LIDER según su participación | `COLABORACION_DESVINCULAR`, `COLABORACION_FINALIZAR`, `COLABORACION_VALORAR`. |
| COLABORADOR | `COLABORADOR_PERFIL_EDITAR`, `COLABORADOR_BAJA`, `PROYECTOS_POTENCIALES_VER`, `NOTIFICACIONES_VER`, `POSTULACION_CREAR`, `POSTULACION_RETIRAR`. |

El frontend y el backend usan el permiso de lectura del colectivo para consultar solicitudes. Las acciones para aceptarlas y rechazarlas requieren el permiso exclusivo del líder.

### Baja de colaboradora y alta posterior

Se retiró `POST /colaboradores/:id/reactivacion`. Tras la baja, la misma cuenta puede completar `POST /colaboradores` para crear un perfil nuevo y un contexto nuevo. El usuario interno y su identidad externa se reutilizan. El contexto nuevo queda como actual. El perfil anterior y su contexto quedan inactivos y conservan sus identificadores y su historial.

MongoDB garantiza un solo contexto activo de colaboradora por usuario mediante un índice parcial único. La migración 004 asegura el índice nuevo antes de retirar la definición anterior. El servicio conserva el control por usuario y rechaza el alta mientras haya un perfil activo o una membresía colectiva activa. [Índices parciales de MongoDB](https://www.mongodb.com/docs/v7.0/core/index-partial/)

Repetir `POST /auth/registro` con la misma identidad devuelve el usuario existente. Una cuenta de Logto con otro `sub` crea su propio usuario al registrarse. El diálogo de baja del frontend explica que una futura alta crea un perfil nuevo y conserva el historial del anterior.

## D. Pruebas

La corrida completa de la auditoría desde `packages/backend` con `npm test -- --maxWorkers=2 --silent --verbose` aprobó **56 suites y 393 pruebas**, sin omisiones. Se ejecutó sobre una copia temporal con las dependencias del lockfile. La instalación directa encontró una entrada inaccesible en el `node_modules` del checkout.

| Directorio | Suites aprobadas | Suites `.test.js` |
| --- | --- | --- |
| `auth` | 1 de 1 | `validacionDeTokens` |
| `domain` | 3 de 3 | `CatalogoDeRoles`, `Colaborador`, `Proyecto` |
| `http` | 23 de 23 | `autenticacion`, `bajaDeColectivos`, `bajaYSesion`, `contextosYMembresias`, `contribucionesAnonimas`, `datosDeContacto`, `datosParaElFront`, `edicionDePerfiles`, `estadisticas`, `limiteDeTasa`, `listadosYFormatos`, `logrosYAvances`, `mediosDeContacto`, `postulaciones`, `publicacionIdempotente`, `reclutamiento`, `redesYEtiquetas`, `reglasYCodigos`, `sanitizacion`, `validacionEnElBorde`, `valoraciones`, `visibilidadYAvisos`, `vistasPublicas` |
| `integracion` | 7 de 7 | `api`, `busquedas`, `concurrencia`, `contextosYTransacciones`, `estadisticas`, `migracionProyectos`, `persistencia` |
| `middlewares` | 1 de 1 | `sanitizar` |
| `models` | 1 de 1 | `formatoJSON` |
| `services` | 19 de 19 | `AvanceService`, `AvisoAutomaticoService`, `BajaDeColectivos`, `CierreAutomatico`, `ColaboracionService`, `ColaboradorService`, `ColectivoService`, `EstadisticaService`, `HabilidadService`, `LogroService`, `NotificacionService`, `PerfilService`, `Postulaciones`, `ProyectoService`, `ReclutamientoService`, `RedesYEtiquetas`, `reglasDeBusqueda`, `Timeline`, `Valoraciones` |
| Raíz de `tests` | 1 de 1 | `jobs` |

También se ejecutaron `npm run lint`, `git diff --check` y `docker compose config --quiet` para ambas configuraciones. Se comprobó que Compose propaga `AUTH_PROVEEDORES`. Una prueba de arranque ejecutó `index.js` con `NODE_ENV=production` sobre MongoDB vacío y confirmó el healthcheck, el 401 sin credencial, el índice de identidad, el validador estricto, los catálogos, las habilidades y las migraciones 002 y 003. Una segunda ejecución con `AUTH_DESACTIVADA=true` terminó con error antes de conectarse a MongoDB.

Tras confirmar los permisos y retirar la reactivación se volvieron a ejecutar `tests/http/contextosYMembresias.test.js`, `tests/domain/CatalogoDeRoles.test.js` y `tests/integracion/contextosYTransacciones.test.js` con MongoDB 7. Pasaron las tres suites y sus 48 pruebas. ESLint y `git diff --check` también pasaron.

Tras incorporar el alta de un perfil nuevo con la misma cuenta, la suite completa pasó con **56 suites y 394 pruebas** sobre MongoDB 7. Las pruebas HTTP comprobaron el alta concurrente y que las colaboraciones sigan asociadas al perfil anterior. La integración de MongoDB comprobó que el cambio de índice conserva los documentos y los índices ajenos. Se verificó el arranque tanto con una base vacía como con el índice anterior.

### Casos incorporados o corregidos

- JWT firmado con clave local. Firma incorrecta, audiencia de cliente, vencimiento, `nbf`, `sub`, claims adicionales, rotación y errores de JWKS, tipos de configuración y desactivación en producción.
- HTTP con usuarios registrados explícitamente. Se verificó que el registro concurrente deje una identidad y un usuario. Un fallo después de ambas escrituras revierte los dos documentos. También se probó el nombre separado del perfil y que la compatibilidad contextual no cambie el registro ni el requisito de nombre.
- Contextos. El contexto activo con entidad de negocio dada de baja o inexistente devuelve 403. Se conservan los casos de contexto ajeno, inexistente, desactualizado y encabezado ausente o inválido. Se agregó la carrera entre selección y baja con verificación del puntero persistido.
- Persistencia y concurrencia. Se probó la validación directa de MongoDB en ambos tipos, el fallo de `collMod`, la conservación de índices ajenos, las modalidades incompatibles concurrentes, la baja de colaboradora contra una postulación, la aceptación concurrente, la aceptación con otra membresía y el rechazo con colaboradora activa.
- Baja de colectivo. Un fallo inyectado después de limpiar contextos revierte colectivo, proyectos, postulaciones, solicitudes, membresías y avisos. Se verificó el commit posterior y la carrera con una publicación y una nueva solicitud. La prueba de publicación idempotente sincroniza las llamadas antes de la escritura que serializa el colectivo.

La verificación usa Node 22, Jest y un replica set temporal de MongoDB 7.0.36. Los tests de JWT usan un servidor JWKS local. El recorrido interactivo con un tenant Logto real, el frontend en navegador y un despliegue con Docker quedan fuera de la evidencia de esta ejecución.

## E. Arquitectura resultante

`src/security` valida tokens, asocia el par externo a un usuario, mantiene los contextos y resuelve la autorización. M1 usa un adaptador configurado. M2 obtiene el usuario. M3 aplica el permiso de ruta sobre el contexto actual, y las guardas HTTP comprueban los IDs del recurso. Las rutas de registro, cuenta y alta pueden funcionar antes de que exista un contexto.

`src/application` coordina altas, bajas y membresías. Pasa datos e identificadores de negocio a `src/services`, que opera sobre colaboradoras, colectivos, proyectos y colaboraciones. La capa de negocio desconoce usuarios, identidades, contextos, permisos y tokens. Los mecanismos de persistencia comparten una transacción y aprovechan conflictos de escritura de MongoDB para reevaluar condiciones al reintentar. La baja de colectivo guarda los avisos en la cola persistente dentro de esa transacción. El job los despacha cuando son visibles tras el commit. [Consideraciones de transacciones de MongoDB](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/) · [Transacciones de Mongoose](https://mongoosejs.com/docs/transactions.html)

La identidad externa se verifica contra la audiencia del recurso de la API. `GET /auth/me` devuelve el ID interno en `usuario.id` y conserva el `id` externo de nivel superior porque el adaptador `aCuenta.js` del frontend lo consume. También conserva `rol` y `perfilId` para ese cliente. El backend obtiene los permisos del rol del contexto persistido. [Validación de access tokens de Logto](https://docs.logto.io/authorization/validate-access-tokens)

## F. Verificación final

| N.º | Estado | Evidencia y alcance |
| --- | --- | --- |
| 1 | Cumplido | `src/domain` contiene las entidades y enums del negocio. |
| 2 | Cumplido | Proveedores, autorización, identidad y persistencia de seguridad están en `src/security`. |
| 3 | Cumplido | Los servicios de negocio operan con sus entidades y repositorios. La coordinación vive en `src/application`. |
| 4 | Cumplido | Se retiraron los campos e índices declarados de `cuentaId`. El entorno objetivo inicia con una base vacía. |
| 5 | Cumplido | Transacción única, índice por proveedor y sujeto y reintento fuera de la transacción abortada. Pruebas HTTP verifican ambos documentos. |
| 6 | Cumplido | Validación JWT contra JWKS y audiencia de API ejercitada con claves locales. El tenant real queda por verificar. |
| 7 | Cumplido | La configuración rechaza `AUTH_DESACTIVADA=true` en producción, incluso si hay proveedor configurado. |
| 8 | Cumplido | M1 autentica, M2 identifica y M3 resuelve autorización contextual. |
| 9 | Cumplido | El rol se lee del contexto persistido. El permiso lo declara la ruta y lo resuelve el catálogo. |
| 10 | Cumplido | `Usuario.contextoActualId` se guarda en MongoDB y es global para el usuario. |
| 11 | Cumplido | M3 valida las rutas de operación contextual. Registro y operaciones de cuenta o alta conservan su nivel de autenticación propio. |
| 12 | Cumplido | La aceptación admite usuarios con otros colectivos y no modifica su contexto actual. |
| 13 | Cumplido | Un usuario no puede activar modalidades opuestas mediante los casos de uso. El control se serializa por usuario en MongoDB. |
| 14 | Cumplido | Transacciones, condiciones persistidas y carreras de alta, baja, postulación, aceptación, liderazgo y selección verificadas con MongoDB. |
| 15 | Cumplido | Rollback integral verificado tras una falla en la última etapa de la baja de colectivo. |
| 16 | Cumplido | MongoDB impone forma y unicidad mediante validador e índices. Las invariantes entre documentos se verifican mediante la aplicación y sus transacciones. |
| 17 | Cumplido | La instalación de validadores propaga errores al arranque. Se probó el rechazo ante un fallo de `collMod`. |
| 18 | Cumplido | Arranque con `createIndexes()` explícito y prueba que conserva un índice operativo ajeno. |
| 19 | Cumplido | Se eliminó la migración 001 y su caso de prueba exclusivo. Se conservaron 002 y 003. |
| 20 | Cumplido | Las facultades exclusivas están confirmadas y el listado de miembros se aprobó para MIEMBRO y LIDER en su contexto actual. La reactivación está retirada del contrato público. |
| 21 | Cumplido | Se preservó la forma de las respuestas y se justificó el paso al registro explícito tras revisar el flujo del cliente. |
| 22 | Cumplido | Suites HTTP, JWT y MongoDB con verificaciones de estado persistido y de rollback. |
| 23 | Cumplido | README, variables de entorno y OpenAPI actualizados según el código. |

## G. Última revisión de autorización y registro

Se detectaron dos puntos de autorización en las operaciones de líder. El modo de desarrollo sin autenticación registraba la baja del colectivo. Además, una solicitud podía pasar M3 y llegar a su escritura después de que otro pedido cambiara el contexto actual del usuario. La baja ahora se registra junto con las demás rutas de gestión autenticadas. Las cinco operaciones verifican y bloquean el contexto actual del usuario dentro de la misma transacción de escritura. M3 sigue resolviendo permisos y la guarda HTTP valida el colectivo de la ruta. La verificación de persistencia protege la decisión frente a cambios concurrentes.

| Operación | Ruta | Permiso |
| --- | --- | --- |
| Baja lógica | `POST /colectivos/:id/baja` | `COLECTIVO_ELIMINAR` |
| Aceptar ingreso | `POST /colectivos/:id/solicitudes-ingreso/:solicitudId/aceptacion` | `MEMBRESIA_SOLICITUD_RESOLVER` |
| Rechazar ingreso | `POST /colectivos/:id/solicitudes-ingreso/:solicitudId/rechazo` | `MEMBRESIA_SOLICITUD_RESOLVER` |
| Quitar miembro | `DELETE /colectivos/:id/miembros/:contextoId` | `MIEMBRO_ELIMINAR` |
| Transferir liderazgo | `POST /colectivos/:id/lider` | `LIDER_ASIGNAR` |

La revisión de las rutas encontró una sola entrada HTTP para cada operación. La cancelación de una solicitud es una operación distinta, disponible para quien la presentó y limitada al estado pendiente. La remoción exige transferir el liderazgo antes de quitar al líder. Las consultas públicas exponen la vista pública del colectivo, y los DTO de cuenta, miembros y solicitudes conservan el contrato de identificadores, nombres y estados. El `id` externo de nivel superior de `/auth/me` se conserva por compatibilidad. Los tokens, sus claims completos y los datos de contacto privados quedan fuera de estas respuestas.

### Registro y `/auth/me`

Con un JWT firmado para la audiencia de la API y un JWKS local, `GET /auth/me` devolvió 403 antes del registro, con cero usuarios e identidades en MongoDB. `POST /auth/registro` devolvió 201 en el alta y 200 con el mismo usuario al repetirse. Luego se comprobó que `GET /auth/me` no modifica el usuario, que el nombre se completa desde la app, que se crea y selecciona el contexto y que una consulta protegida requiere `X-Context-Id`. En esta revisión del backend, el cliente aún iniciaba el registro a partir de un 403. El cambio de orden en el frontend se describe en la sección H. La prueba del backend usa JWT y JWKS locales. El login en navegador con un tenant real queda por verificar.

### Reactivación

Se mantiene retirada del contrato público. El alta nueva con la misma cuenta sigue el acuerdo previo y conserva el historial. Mantener la ruta deshabilitada habría preservado su existencia formal, aunque un cliente que la llamara seguiría recibiendo un error y necesitaría cambiar el botón y el texto de la pantalla. Con la ruta retirada, una llamada antigua recibe 404 con una credencial válida. El backend actual dejó de emitir la señal con la que el cliente mostraba ese botón. Si se retomara la reactivación, habría que acordar cómo tratar perfiles históricos inexistentes o contextos inconsistentes, qué hacer con las solicitudes pendientes y cómo serializar dos pedidos concurrentes. El alta nueva actual exige que la cuenta no opere con modalidad colectiva activa.

### Archivos de esta revisión

Se ajustaron `src/routes/colectivosRouter.js`, `src/application/MembresiaService.js`, `src/security/application/{ContextoService,LiderazgoService}.js`, `src/security/persistencia/MongoUsuarioRepository.js` y `src/composicion.js`. Se actualizaron `src/docs/openapi/rutas/colectivos.js`, el README y este informe. Las pruebas ampliadas están en `tests/auth/validacionDeTokens.test.js` y `tests/http/{bajaDeColectivos,contextosYMembresias}.test.js`.

### Pruebas y pendientes

La corrida enfocada pasó con **79 pruebas en 4 suites**. La suite completa posterior pasó con **398 pruebas en 56 suites** en un replica set de MongoDB 7.0.36. También pasaron ESLint sobre el backend y `git diff --check`. Las pruebas de regresión HTTP cubren las cinco rutas fuera del colectivo actual, el intento con rol de miembro, el cambio de contexto después de M3, los recursos de otro colectivo, el modo sin autenticación y el registro con JWT. Las verificaciones persistidas cubren el estado del colectivo, las solicitudes, los contextos y el liderazgo. Se ratificó la consulta del listado para MIEMBRO y LIDER en el colectivo de su contexto actual. Tras documentarlo en el README y OpenAPI, se ampliaron las pruebas HTTP para verificar que el listado responde 200 en el colectivo seleccionado y 403 para otro colectivo, incluso si el usuario tiene allí un contexto disponible. Las suites de membresías y catálogo aprobaron sus 31 pruebas.

Esa revisión se limitó al backend. La sección H registra los cambios posteriores en la interfaz.

## H. Cierre del flujo de sesión y la interfaz

1. Logto autentica a la persona y el SDK obtiene un access token con audiencia del recurso de la API.
2. Al iniciar o restaurar una sesión, `AuthProvider.jsx` envía `POST /auth/registro` con ese token y espera la confirmación. El backend crea o recupera la identidad externa y el usuario en una transacción idempotente.
3. El frontend consulta `GET /auth/me` después del registro. Si falla el registro, el reintento vuelve a registrar. Si falla la consulta después de confirmar el registro, se reintenta solo la consulta. Las recargas de cuenta de la misma sesión también son consultas.
4. La aplicación obtiene `nombrePendiente` de la respuesta. Si corresponde, pide el nombre propio y lo persiste mediante `PUT /auth/usuario`. El nombre del proveedor queda fuera del registro interno.
5. La persona crea un perfil compatible o selecciona un contexto con `PUT /auth/contexto-actual`. El cliente envía el ID vigente en `X-Context-Id` al operar con ese contexto.

La matriz de la sección C quedó confirmada. El frontend usa `COLECTIVO_MIEMBROS_VER` para habilitar la consulta de solicitudes y `MEMBRESIA_SOLICITUD_RESOLVER` para mostrar sus acciones. La pantalla de alta de colaboradora usa el formulario normal. Se retiraron el botón y el cliente de reactivación. Después de la baja, el historial permanece en el perfil previo y una futura alta con la misma cuenta crea otro perfil y otro contexto.

### Archivos de este cierre

| Repositorio | Archivos y motivo |
| --- | --- |
| Frontend. Sesión | `AuthProvider.jsx` ordena el registro y la consulta y recuerda el registro confirmado para la sesión. `src/test/{montarRutas,Proveedores}.jsx` y `inicio.test.jsx` completan el contrato de los dobles. `logtoReact.test.jsx`, `sesion.test.jsx` y `sesionYContextos.test.jsx` verifican orden, reintentos, expiración, nombre y contexto. |
| Frontend. Colaboradora | `BajaDeColaboradora.jsx` explica la futura alta. `AltaColaboradoraPage.jsx` muestra el formulario y sus errores. `colaboradorDependencies.js`, `ColaboradorHttpClient.js`, `bajaDeColaboradora.js` y `CODIGO_ERROR.js` retiran el flujo anterior. Se eliminaron `ReactivarColaboradora.jsx`, `useReactivarColaboradora.js` y `ReactivarColaborador.js`. `bajaDeColaboradora.test.jsx` recorre baja y alta de un perfil distinto. |
| Frontend. Permisos | `navegacion.js` y `SolicitudesDeIngresoPage.jsx` separan consulta y resolución. `membresia.test.jsx` verifica que el miembro consulte con su contexto y que las acciones queden reservadas al líder. |
| Frontend. Documentación | `README.md`, `PRODUCT.md`, `docs/{PLAN-ENTIDADES,decisiones,pendientes-con-el-back,plan-front,traspaso}.md` y las specs 01, 10, 13, 15 e `integracion-logto-react.md` reflejan el contrato. La spec `15-baja-del-perfil-de-colaboradora.md` reemplaza el nombre anterior. |
| Backend | `src/docs/openapi/{index.js,rutas/cuenta.js}` y `README.md` documentan el registro previo y el carácter de solo lectura de `/auth/me`. `tests/auth/validacionDeTokens.test.js` verifica el estado persistido de la identidad y el usuario, con un nombre distinto en el JWT. |

### Verificación del cierre

| Verificación | Resultado |
| --- | --- |
| Backend, Jest y replica set de MongoDB 7.0.36 | 398 pruebas aprobadas en 56 suites. |
| Frontend, Vitest | 880 pruebas aprobadas en 78 archivos con `npm test -- --maxWorkers=1 --testTimeout=15000`. La primera corrida completa agotó el límite de 5 s en dos pruebas del asistente de proyectos mientras corría Playwright. |
| Frontend, Playwright en Edge con sesión simulada | 15 pruebas aprobadas. |
| ESLint y build | ESLint aprobó en ambos repositorios. El build del frontend aprobó. |
| Formato | `git diff --check` aprobó en ambos repositorios. El chequeo global de Prettier del frontend señala `docs/decisiones.md` y `docs/PLAN-ENTIDADES.md`. Se comprobó que esos dos archivos ya fallaban en `HEAD`. |

El login con un tenant real de Logto queda por verificar. Vitest ejercitó el SDK React con un cliente de prueba. El backend verificó JWT y JWKS locales y Playwright recorrió la app con sesión simulada.
