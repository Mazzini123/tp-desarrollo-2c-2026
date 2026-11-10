import { CatalogoDeRoles } from "../../src/domain/CatalogoDeRoles.js";
import { asegurarCatalogos } from "../../src/seed/catalogosSeed.js";
import { PERMISO } from "../../src/domain/enums/PERMISO.js";
import { ROLES } from "../../src/domain/rolesYPermisos.js";

function repositorioEnMemoria() {
  const colecciones = {
    permisos: new Map(),
    tipos: new Map(),
    roles: new Map(),
    proveedores: new Map(),
  };
  const upsert = (mapa, items, alCrear = {}) =>
    items.forEach((item) =>
      mapa.set(item.codigo, { ...alCrear, ...mapa.get(item.codigo), ...item }),
    );
  return {
    colecciones,
    asegurarPermisos: async (items) => upsert(colecciones.permisos, items),
    asegurarTiposDeContexto: async (items) => upsert(colecciones.tipos, items),
    asegurarRoles: async (items) => upsert(colecciones.roles, items),
    asegurarProveedores: async (items) =>
      upsert(colecciones.proveedores, items, { activo: true }),
    listarRoles: async () => [...colecciones.roles.values()],
    listarCodigosDePermiso: async () => [...colecciones.permisos.keys()],
    listarCodigosDeProveedoresActivos: async () =>
      [...colecciones.proveedores.values()].filter((p) => p.activo).map((p) => p.codigo),
  };
}

describe("catalogo de roles y permisos", () => {
  const catalogo = new CatalogoDeRoles();

  test("LIDER tiene todos los permisos de MIEMBRO y ademas los propios", () => {
    for (const permiso of catalogo.permisosDe("MIEMBRO")) {
      expect(catalogo.tienePermiso("LIDER", permiso)).toBe(true);
    }
    for (const permiso of [
      PERMISO.COLECTIVO_EDITAR,
      PERMISO.COLECTIVO_CONTACTO_GESTIONAR,
      PERMISO.COLECTIVO_ELIMINAR,
      PERMISO.MEMBRESIA_SOLICITUD_RESOLVER,
      PERMISO.MIEMBRO_ELIMINAR,
      PERMISO.LIDER_ASIGNAR,
    ]) {
      expect(catalogo.tienePermiso("LIDER", permiso)).toBe(true);
      expect(catalogo.tienePermiso("MIEMBRO", permiso)).toBe(false);
    }
  });

  test("la colaboradora no tiene permisos de colectivo ni el colectivo de colaboradora", () => {
    expect(catalogo.tienePermiso("COLABORADOR", PERMISO.PROYECTO_CREAR)).toBe(false);
    expect(catalogo.tienePermiso("LIDER", PERMISO.POSTULACION_CREAR)).toBe(false);
    expect(catalogo.tienePermiso("ROL_INEXISTENTE", PERMISO.PROYECTO_CREAR)).toBe(false);
  });

  test("todo permiso del enum esta asignado a algun rol", () => {
    const asignados = new Set(ROLES.flatMap((rol) => rol.permisos));
    expect(Object.values(PERMISO).filter((p) => !asignados.has(p))).toEqual([]);
  });

  test("el seed es idempotente y no habilita de nuevo un proveedor deshabilitado", async () => {
    const repositorio = repositorioEnMemoria();
    const proveedores = [{ codigo: "logto", nombre: "Logto", mecanismo: "OIDC_JWT" }];

    await asegurarCatalogos(repositorio, proveedores);
    repositorio.colecciones.proveedores.get("logto").activo = false;
    const resultado = await asegurarCatalogos(repositorio, proveedores);

    expect(repositorio.colecciones.roles.size).toBe(3);
    expect(repositorio.colecciones.permisos.size).toBe(Object.values(PERMISO).length);
    expect(repositorio.colecciones.tipos.size).toBe(2);
    expect(resultado.proveedoresActivos).toEqual([]);
  });
});
