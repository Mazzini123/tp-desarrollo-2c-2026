import {
  PermisoModel,
  ProveedorAutentificadorModel,
  RolModel,
  TipoContextoModel,
} from "../models/catalogos.js";

function upsertPorCodigo(modelo, items, { soloAlCrear = null } = {}) {
  if (items.length === 0) return Promise.resolve();
  return modelo.bulkWrite(
    items.map(({ codigo, ...resto }) => ({
      updateOne: {
        filter: { codigo },
        update: { $set: resto, ...(soloAlCrear && { $setOnInsert: soloAlCrear }) },
        upsert: true,
      },
    })),
  );
}

export class MongoCatalogoRepository {
  asegurarPermisos(permisos) {
    return upsertPorCodigo(PermisoModel, permisos);
  }

  asegurarTiposDeContexto(tipos) {
    return upsertPorCodigo(TipoContextoModel, tipos);
  }

  asegurarRoles(roles) {
    return upsertPorCodigo(RolModel, roles);
  }

  asegurarProveedores(proveedores) {
    return upsertPorCodigo(ProveedorAutentificadorModel, proveedores, {
      soloAlCrear: { activo: true },
    });
  }

  async listarRoles() {
    return RolModel.find().lean();
  }

  async listarCodigosDePermiso() {
    return (await PermisoModel.find({}, { codigo: 1 }).lean()).map((p) => p.codigo);
  }

  async listarCodigosDeProveedoresActivos() {
    const activos = await ProveedorAutentificadorModel.find(
      { activo: true },
      { codigo: 1 },
    ).lean();
    return activos.map((p) => p.codigo);
  }
}
