import { PERMISOS, ROLES, TIPOS_DE_CONTEXTO } from "./autorizacion/rolesYPermisos.js";

export async function asegurarCatalogos(catalogoRepository, proveedores = []) {
  await catalogoRepository.asegurarPermisos(PERMISOS);
  await catalogoRepository.asegurarTiposDeContexto(TIPOS_DE_CONTEXTO);
  await catalogoRepository.asegurarRoles(ROLES.map(({ nombre }) => ({ nombre })));
  for (const { nombre, permisos } of ROLES) {
    await catalogoRepository.asegurarPermisosDeRol(nombre, permisos);
  }
  await catalogoRepository.asegurarProveedores(
    proveedores.map(({ codigo, nombre, mecanismo }) => ({
      proveedor: codigo,
      nombre: nombre ?? codigo,
      mecanismo,
    })),
  );

  const enLaBase = new Set(await catalogoRepository.listarNombresDePermiso());
  const faltantes = PERMISOS.filter(({ nombre }) => !enLaBase.has(nombre));
  if (faltantes.length > 0) {
    throw new Error(
      `Faltan permisos en el catalogo: ${faltantes.map((p) => p.nombre).join(", ")}`,
    );
  }

  return {
    roles: await catalogoRepository.listarRoles(),
    proveedoresActivos: await catalogoRepository.listarProveedoresActivos(),
  };
}
