import { PERMISO } from "../domain/enums/PERMISO.js";
import {
  DESCRIPCION_DE_PERMISOS,
  ROLES,
  TIPOS_DE_CONTEXTO,
} from "../domain/rolesYPermisos.js";

export async function asegurarCatalogos(catalogoRepository, proveedores = []) {
  await catalogoRepository.asegurarPermisos(
    Object.values(PERMISO).map((codigo) => ({
      codigo,
      descripcion: DESCRIPCION_DE_PERMISOS[codigo],
    })),
  );
  await catalogoRepository.asegurarTiposDeContexto(TIPOS_DE_CONTEXTO);
  await catalogoRepository.asegurarRoles(ROLES);
  await catalogoRepository.asegurarProveedores(
    proveedores.map(({ codigo, nombre, mecanismo }) => ({
      codigo,
      nombre: nombre ?? codigo,
      mecanismo,
    })),
  );

  const enLaBase = new Set(await catalogoRepository.listarCodigosDePermiso());
  const faltantes = Object.values(PERMISO).filter((codigo) => !enLaBase.has(codigo));
  if (faltantes.length > 0) {
    throw new Error(`Faltan permisos en el catalogo: ${faltantes.join(", ")}`);
  }

  return {
    roles: await catalogoRepository.listarRoles(),
    proveedoresActivos: await catalogoRepository.listarCodigosDeProveedoresActivos(),
  };
}
