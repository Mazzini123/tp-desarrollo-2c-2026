/* global db, print, ObjectId */
// Verifica en la base real que el modelo de seguridad respete el diseño:
// colecciones, tipos de las referencias, índices únicos, validadores,
// integridad referencial y que la base rechace documentos inválidos.
//
// Con Docker (desde la raíz del repo):
//   MSYS_NO_PATHCONV=1 docker exec cav-mongo mongosh codigo-a-voluntad --quiet --eval "$(cat packages/backend/scripts/verificarModelo.mongosh.js)"
//
// No modifica datos: las pruebas de rechazo esperan que la base no inserte
// nada, y si algo se insertara por error lo borra y lo informa como falla.

let fallas = 0;
const ok = (texto) => print(`  OK    ${texto}`);
const mal = (texto) => {
  fallas++;
  print(`  FALLA ${texto}`);
};
const chequear = (condicion, texto) => (condicion ? ok(texto) : mal(texto));
const titulo = (texto) => print(`\n== ${texto}`);

const COLECCIONES = {
  Usuario: "usuarios",
  ContextoUsuario: "contextosUsuario",
  TipoContexto: "tiposContexto",
  Rol: "roles",
  Permiso: "permisos",
  RolXPermiso: "rolesXPermisos",
  IdentidadExterna: "identidadesExternas",
  ProveedorAutentificador: "proveedoresAutentificadores",
  Colectivo: "colectivos",
  Colaborador: "colaboradors",
};

titulo("1. Una colección por clase");
const existentes = db.getCollectionNames();
for (const [clase, coleccion] of Object.entries(COLECCIONES)) {
  const cantidad = existentes.includes(coleccion)
    ? db.getCollection(coleccion).countDocuments()
    : null;
  chequear(
    cantidad !== null,
    `${clase} -> ${coleccion} (${cantidad ?? "no existe"} documentos)`,
  );
}

titulo("2. Ningún catálogo embebe otra entidad");
const conCampo = (coleccion, campo) =>
  db.getCollection(coleccion).countDocuments({ [campo]: { $exists: true } });
chequear(conCampo("roles", "permisos") === 0, "roles no tiene un array de permisos");
chequear(conCampo("roles", "tipoContexto") === 0, "roles no guarda el tipo de contexto");
chequear(
  conCampo("usuarios", "identidadExterna") === 0,
  "usuarios no embebe la identidad externa",
);
chequear(
  conCampo("contextosUsuario", "rol") === 0,
  "contextosUsuario no guarda el rol como texto",
);
chequear(
  conCampo("contextosUsuario", "tipo") === 0,
  "contextosUsuario no guarda el tipo como texto",
);
chequear(
  conCampo("identidadesExternas", "proveedor") === 0,
  "identidadesExternas no guarda el proveedor como texto",
);

titulo("3. Las referencias son ObjectId (y null solo donde el diseño lo permite)");
const REFERENCIAS = [
  ["usuarios", "identidadExternaId", false],
  ["usuarios", "contextoActualId", true],
  ["identidadesExternas", "proveedorId", false],
  ["contextosUsuario", "usuarioId", false],
  ["contextosUsuario", "tipoContextoId", false],
  ["contextosUsuario", "rolId", false],
  ["contextosUsuario", "colectivoId", true],
  ["contextosUsuario", "colaboradorId", true],
  ["rolesXPermisos", "rolId", false],
  ["rolesXPermisos", "permisoId", false],
];
for (const [coleccion, campo, admiteNull] of REFERENCIAS) {
  const tipos = admiteNull ? ["objectId", "null"] : ["objectId"];
  const invalidos = db
    .getCollection(coleccion)
    .countDocuments({ [campo]: { $not: { $type: tipos } } });
  chequear(
    invalidos === 0,
    `${coleccion}.${campo}: ${tipos.join(" | ")} (${invalidos} inválidos)`,
  );
}

titulo("4. Índices únicos");
function tieneUnico(coleccion, claves) {
  return db
    .getCollection(coleccion)
    .getIndexes()
    .some(
      (indice) =>
        indice.unique &&
        !indice.partialFilterExpression &&
        JSON.stringify(Object.keys(indice.key)) === JSON.stringify(claves),
    );
}
chequear(tieneUnico("usuarios", ["identidadExternaId"]), "usuarios.identidadExternaId");
chequear(
  tieneUnico("identidadesExternas", ["proveedorId", "identificadorExterno"]),
  "identidadesExternas (proveedorId, identificadorExterno)",
);
chequear(
  tieneUnico("proveedoresAutentificadores", ["proveedor"]),
  "proveedoresAutentificadores.proveedor",
);
chequear(
  tieneUnico("rolesXPermisos", ["rolId", "permisoId"]),
  "rolesXPermisos (rolId, permisoId)",
);

titulo("5. Validadores instalados en la base");
for (const coleccion of [
  "usuarios",
  "identidadesExternas",
  "rolesXPermisos",
  "contextosUsuario",
]) {
  const [info] = db.getCollectionInfos({ name: coleccion });
  chequear(Boolean(info?.options?.validator), coleccion);
}

titulo("6. Integridad referencial (cada referencia apunta a un documento que existe)");
function huerfanos(coleccion, campo, destino) {
  return (
    db
      .getCollection(coleccion)
      .aggregate([
        { $match: { [campo]: { $type: "objectId" } } },
        {
          $lookup: {
            from: destino,
            localField: campo,
            foreignField: "_id",
            as: "destino",
          },
        },
        { $match: { destino: { $size: 0 } } },
        { $count: "n" },
      ])
      .toArray()[0]?.n ?? 0
  );
}
for (const [coleccion, campo, destino] of [
  ["usuarios", "identidadExternaId", "identidadesExternas"],
  ["usuarios", "contextoActualId", "contextosUsuario"],
  ["identidadesExternas", "proveedorId", "proveedoresAutentificadores"],
  ["contextosUsuario", "usuarioId", "usuarios"],
  ["contextosUsuario", "tipoContextoId", "tiposContexto"],
  ["contextosUsuario", "rolId", "roles"],
  ["contextosUsuario", "colectivoId", "colectivos"],
  ["contextosUsuario", "colaboradorId", "colaboradors"],
  ["rolesXPermisos", "rolId", "roles"],
  ["rolesXPermisos", "permisoId", "permisos"],
]) {
  const n = huerfanos(coleccion, campo, destino);
  chequear(n === 0, `${coleccion}.${campo} -> ${destino} (${n} sin destino)`);
}
const ajenos =
  db.usuarios
    .aggregate([
      { $match: { contextoActualId: { $type: "objectId" } } },
      {
        $lookup: {
          from: "contextosUsuario",
          localField: "contextoActualId",
          foreignField: "_id",
          as: "c",
        },
      },
      { $unwind: "$c" },
      {
        $match: {
          $expr: {
            $or: [{ $ne: ["$c.usuarioId", "$_id"] }, { $ne: ["$c.activo", true] }],
          },
        },
      },
      { $count: "n" },
    ])
    .toArray()[0]?.n ?? 0;
chequear(
  ajenos === 0,
  `contextoActualId apunta a un contexto activo del propio usuario (${ajenos} mal)`,
);
const ambos = db.contextosUsuario.countDocuments({
  colectivoId: { $type: "objectId" },
  colaboradorId: { $type: "objectId" },
});
chequear(
  ambos === 0,
  `ningún contexto tiene colectivo y colaborador a la vez (${ambos})`,
);

titulo("7. La base rechaza documentos que rompen el diseño");
function debeRechazar(coleccion, documento, descripcion) {
  try {
    const { insertedId } = db.getCollection(coleccion).insertOne(documento);
    db.getCollection(coleccion).deleteOne({ _id: insertedId });
    mal(`${descripcion}: se insertó (y se borró)`);
  } catch (error) {
    const motivo =
      error.code === 11000
        ? "índice único"
        : error.code === 121
          ? "validador"
          : `código ${error.code}`;
    ok(`${descripcion}: rechazado por ${motivo}`);
  }
}
const id = () => new ObjectId();
debeRechazar("usuarios", { contextoActualId: null }, "usuario sin identidadExternaId");
debeRechazar(
  "usuarios",
  { identidadExternaId: "abc", contextoActualId: null },
  "usuario con identidadExternaId de texto",
);
debeRechazar(
  "identidadesExternas",
  { proveedor: "logto", identificadorExterno: "x" },
  "identidad con el proveedor como texto",
);
debeRechazar(
  "rolesXPermisos",
  { rolId: "LIDER", permisoId: "PROYECTO_CREAR" },
  "rolXPermiso con códigos en vez de referencias",
);
debeRechazar(
  "contextosUsuario",
  {
    usuarioId: id(),
    tipoContextoId: id(),
    rolId: "LIDER",
    colectivoId: id(),
    colaboradorId: null,
    activo: true,
  },
  "contexto con el rol como texto",
);
const proveedor = db.proveedoresAutentificadores.findOne();
if (proveedor)
  debeRechazar(
    "proveedoresAutentificadores",
    { proveedor: proveedor.proveedor },
    "proveedor repetido",
  );
const asignacion = db.rolesXPermisos.findOne();
if (asignacion) {
  debeRechazar(
    "rolesXPermisos",
    { rolId: asignacion.rolId, permisoId: asignacion.permisoId },
    "rolXPermiso repetido",
  );
}
const identidad = db.identidadesExternas.findOne();
if (identidad) {
  debeRechazar(
    "identidadesExternas",
    {
      proveedorId: identidad.proveedorId,
      identificadorExterno: identidad.identificadorExterno,
    },
    "identidad externa repetida",
  );
  debeRechazar(
    "usuarios",
    { identidadExternaId: identidad._id, contextoActualId: null },
    "segundo usuario para la misma identidad",
  );
} else {
  print(
    "  --    sin identidades todavía: registrate en el front para probar los duplicados de identidad",
  );
}

titulo("8. Matriz de permisos por rol (leída de rolesXPermisos)");
db.roles
  .aggregate([
    {
      $lookup: {
        from: "rolesXPermisos",
        localField: "_id",
        foreignField: "rolId",
        as: "asignaciones",
      },
    },
    { $project: { _id: 0, nombre: 1, permisos: { $size: "$asignaciones" } } },
    { $sort: { nombre: 1 } },
  ])
  .forEach((rol) => print(`  ${rol.nombre}: ${rol.permisos} permisos`));

print(
  fallas === 0
    ? "\nRESULTADO: el modelo cumple el diseño"
    : `\nRESULTADO: ${fallas} falla(s)`,
);
