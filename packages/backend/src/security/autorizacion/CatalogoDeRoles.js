import { ROLES } from "./rolesYPermisos.js";

export class CatalogoDeRoles {
  constructor(roles = ROLES) {
    this.permisosPorRol = new Map(
      roles.map((rol) => [rol.codigo, new Set(rol.permisos)]),
    );
  }

  tienePermiso(rol, permiso) {
    return this.permisosPorRol.get(rol)?.has(permiso) ?? false;
  }

  permisosDe(rol) {
    return [...(this.permisosPorRol.get(rol) ?? [])];
  }
}
