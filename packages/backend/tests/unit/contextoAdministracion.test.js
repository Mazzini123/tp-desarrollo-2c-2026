import {
  PERMISOS,
  ROLES,
  ROLES_POR_TIPO,
  TIPOS_DE_CONTEXTO,
  problemaDeConsistencia,
} from "../../src/security/autorizacion/rolesYPermisos.js";
import { CatalogoDeRoles } from "../../src/security/autorizacion/CatalogoDeRoles.js";
import { PERMISO } from "../../src/security/autorizacion/enums/PERMISO.js";
import { ROL } from "../../src/security/autorizacion/enums/ROL.js";
import { TIPO_CONTEXTO } from "../../src/security/autorizacion/enums/TIPO_CONTEXTO.js";

const PERMISOS_DE_ADMINISTRACION = [
  PERMISO.PROYECTO_DESTACAR,
  PERMISO.REVISION_VER,
  PERMISO.REVISION_RESOLVER,
  PERMISO.AUDITORIA_VER,
  PERMISO.ADMIN_GESTIONAR,
  PERMISO.TERMINOS_GESTIONAR,
  PERMISO.BAJA_POR_INFRACCION,
];

describe("contexto de administracion · catalogo", () => {
  test("existe el tipo ADMINISTRACION y el rol ADMIN, y solo ese rol le corresponde", () => {
    expect(TIPO_CONTEXTO.ADMINISTRACION).toBe("ADMINISTRACION");
    expect(ROL.ADMIN).toBe("ADMIN");
    expect(TIPOS_DE_CONTEXTO).toContainEqual({ nombre: "ADMINISTRACION" });
    expect(ROLES_POR_TIPO[TIPO_CONTEXTO.ADMINISTRACION]).toEqual([ROL.ADMIN]);
  });

  test("ADMIN tiene exactamente los permisos de administracion", () => {
    const catalogo = new CatalogoDeRoles();
    expect(catalogo.permisosDe(ROL.ADMIN).sort()).toEqual(
      [...PERMISOS_DE_ADMINISTRACION].sort(),
    );
  });

  test("los permisos de administracion no los tiene ningun otro rol", () => {
    const catalogo = new CatalogoDeRoles();
    for (const { nombre } of ROLES.filter((rol) => rol.nombre !== ROL.ADMIN)) {
      for (const permiso of PERMISOS_DE_ADMINISTRACION) {
        expect(catalogo.tienePermiso(nombre, permiso)).toBe(false);
      }
    }
  });

  test("ADMIN no hereda permisos de colectivo ni de colaboradora", () => {
    const catalogo = new CatalogoDeRoles();
    for (const permiso of [
      PERMISO.PROYECTO_CREAR,
      PERMISO.POSTULACION_CREAR,
      PERMISO.COLECTIVO_ELIMINAR,
      PERMISO.NOTIFICACIONES_VER,
    ]) {
      expect(catalogo.tienePermiso(ROL.ADMIN, permiso)).toBe(false);
    }
  });

  test("cada permiso de administracion tiene descripcion", () => {
    for (const permiso of PERMISOS_DE_ADMINISTRACION) {
      expect(PERMISOS.find((p) => p.nombre === permiso)?.descripcion).toEqual(
        expect.any(String),
      );
    }
  });
});

describe("contexto de administracion · consistencia", () => {
  const admin = { tipo: TIPO_CONTEXTO.ADMINISTRACION, rol: ROL.ADMIN };

  test("un contexto ADMINISTRACION no apunta a colectivo ni a colaboradora", () => {
    expect(problemaDeConsistencia(admin)).toBeNull();
    expect(problemaDeConsistencia({ ...admin, colectivoId: "c1" })).toMatch(
      /no tiene colectivo ni colaborador/,
    );
    expect(problemaDeConsistencia({ ...admin, colaboradorId: "p1" })).toMatch(
      /no tiene colectivo ni colaborador/,
    );
  });

  test("ADMIN no corresponde a los otros tipos y los otros roles no a ADMINISTRACION", () => {
    expect(
      problemaDeConsistencia({
        tipo: TIPO_CONTEXTO.COLECTIVO,
        rol: ROL.ADMIN,
        colectivoId: "c1",
      }),
    ).toMatch(/no corresponde/);
    expect(
      problemaDeConsistencia({
        tipo: TIPO_CONTEXTO.COLABORADOR,
        rol: ROL.ADMIN,
        colaboradorId: "p1",
      }),
    ).toMatch(/no corresponde/);
    expect(
      problemaDeConsistencia({ tipo: TIPO_CONTEXTO.ADMINISTRACION, rol: ROL.LIDER }),
    ).toMatch(/no corresponde/);
  });
});
