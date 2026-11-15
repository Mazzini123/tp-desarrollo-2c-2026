import {
  PermisoModel,
  ProveedorAutentificadorModel,
  RolModel,
  RolXPermisoModel,
  TipoContextoModel,
} from "./catalogos.js";

const CATALOGOS = Object.freeze({
  roles: { modelo: RolModel, clave: "nombre" },
  tiposContexto: { modelo: TipoContextoModel, clave: "nombre" },
  permisos: { modelo: PermisoModel, clave: "nombre" },
  proveedores: { modelo: ProveedorAutentificadorModel, clave: "proveedor" },
});

function upsertPorClave(modelo, clave, items, { soloAlCrear = null } = {}) {
  if (items.length === 0) return Promise.resolve();
  return modelo.bulkWrite(
    items.map(({ [clave]: valor, ...resto }) => ({
      updateOne: {
        filter: { [clave]: valor },
        update: {
          ...(Object.keys(resto).length > 0 && { $set: resto }),
          $setOnInsert: { [clave]: valor, ...soloAlCrear },
        },
        upsert: true,
      },
    })),
  );
}

export class MongoCatalogoRepository {
  constructor() {
    this.referencias = new Map();
  }

  async asegurarPermisos(permisos) {
    await upsertPorClave(PermisoModel, "nombre", permisos);
    this.referencias.delete("permisos");
  }

  async asegurarTiposDeContexto(tipos) {
    await upsertPorClave(TipoContextoModel, "nombre", tipos);
    this.referencias.delete("tiposContexto");
  }

  async asegurarRoles(roles) {
    await upsertPorClave(RolModel, "nombre", roles);
    this.referencias.delete("roles");
  }

  async asegurarProveedores(proveedores) {
    await upsertPorClave(ProveedorAutentificadorModel, "proveedor", proveedores, {
      soloAlCrear: { activo: true },
    });
    this.referencias.delete("proveedores");
  }

  async asegurarPermisosDeRol(rol, permisos) {
    const rolId = await this.idDeRol(rol);
    const permisoIds = [];
    for (const permiso of permisos) {
      permisoIds.push(await this.#idExigido("permisos", permiso));
    }
    if (permisoIds.length > 0) {
      await RolXPermisoModel.bulkWrite(
        permisoIds.map((permisoId) => ({
          updateOne: {
            filter: { rolId, permisoId },
            update: { $setOnInsert: { rolId, permisoId } },
            upsert: true,
          },
        })),
      );
    }
    await RolXPermisoModel.deleteMany({ rolId, permisoId: { $nin: permisoIds } });
  }

  async listarRoles() {
    const [roles, permisos, asignaciones] = await Promise.all([
      RolModel.find().lean(),
      PermisoModel.find().lean(),
      RolXPermisoModel.find().lean(),
    ]);
    const nombreDePermiso = new Map(permisos.map((p) => [String(p._id), p.nombre]));
    return roles.map((rol) => ({
      id: String(rol._id),
      nombre: rol.nombre,
      permisos: asignaciones
        .filter((a) => String(a.rolId) === String(rol._id))
        .map((a) => nombreDePermiso.get(String(a.permisoId)))
        .filter(Boolean),
    }));
  }

  async listarNombresDePermiso() {
    return (await PermisoModel.find({}, { nombre: 1 }).lean()).map((p) => p.nombre);
  }

  async listarProveedoresActivos() {
    const activos = await ProveedorAutentificadorModel.find(
      { activo: true },
      { proveedor: 1 },
    ).lean();
    return activos.map((p) => p.proveedor);
  }

  idDeRol(nombre) {
    return this.#idExigido("roles", nombre);
  }

  nombreDeRol(id) {
    return this.#nombreExigido("roles", id);
  }

  idDeTipoDeContexto(nombre) {
    return this.#idExigido("tiposContexto", nombre);
  }

  nombreDeTipoDeContexto(id) {
    return this.#nombreExigido("tiposContexto", id);
  }

  async idDeProveedor(proveedor) {
    return (await this.#buscar("proveedores", "ids", proveedor)) ?? null;
  }

  async #cargar(catalogo) {
    const { modelo, clave } = CATALOGOS[catalogo];
    const documentos = await modelo.find({}, { [clave]: 1 }).lean();
    const tabla = {
      ids: new Map(documentos.map((d) => [d[clave], d._id])),
      nombres: new Map(documentos.map((d) => [String(d._id), d[clave]])),
    };
    this.referencias.set(catalogo, tabla);
    return tabla;
  }

  async #buscar(catalogo, sentido, valor) {
    const clave = String(valor);
    const enMemoria = this.referencias.get(catalogo)?.[sentido].get(clave);
    if (enMemoria !== undefined) return enMemoria;
    return (await this.#cargar(catalogo))[sentido].get(clave);
  }

  async #idExigido(catalogo, nombre) {
    const id = await this.#buscar(catalogo, "ids", nombre);
    if (!id) throw new Error(`Falta "${nombre}" en el catalogo de ${catalogo}`);
    return id;
  }

  async #nombreExigido(catalogo, id) {
    const nombre = await this.#buscar(catalogo, "nombres", id);
    if (!nombre) throw new Error(`El catalogo de ${catalogo} no tiene el id ${id}`);
    return nombre;
  }
}
