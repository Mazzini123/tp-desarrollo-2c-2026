import { describe, it, expect } from "@jest/globals";
import { Ubicacion } from "../../../src/domain/valueObjects/Ubicacion.js";
import { NivelUbicacion } from "../../../src/domain/enums/NivelUbicacion.js";
import { DomainError } from "../../../src/domain/DomainError.js";

describe("Ubicacion", () => {
  it("se construye con nivel ARGENTINA sin detalle", () => {
    const ubicacion = new Ubicacion({ nivel: NivelUbicacion.ARGENTINA });
    expect(ubicacion.esDeAlcanceNacional()).toBe(true);
    expect(ubicacion.detalle).toBeNull();
  });

  it("se construye con nivel CABA sin detalle", () => {
    const ubicacion = new Ubicacion({ nivel: NivelUbicacion.CABA });
    expect(ubicacion.esDeAlcanceNacional()).toBe(false);
    expect(ubicacion.detalle).toBeNull();
  });

  it("acepta PROVINCIA con una de las 23 provincias como detalle", () => {
    const ubicacion = new Ubicacion({ nivel: NivelUbicacion.PROVINCIA, detalle: "Cordoba" });
    expect(ubicacion.detalle).toBe("Cordoba");
  });

  it("rechaza PROVINCIA con un detalle que no es una provincia válida", () => {
    expect(
      () => new Ubicacion({ nivel: NivelUbicacion.PROVINCIA, detalle: "Narnia" }),
    ).toThrow(DomainError);
  });

  it("rechaza PROVINCIA sin detalle", () => {
    expect(() => new Ubicacion({ nivel: NivelUbicacion.PROVINCIA })).toThrow(DomainError);
  });

  it("acepta LOCALIDAD con texto libre como detalle", () => {
    const ubicacion = new Ubicacion({ nivel: NivelUbicacion.LOCALIDAD, detalle: "Villa Devoto" });
    expect(ubicacion.detalle).toBe("Villa Devoto");
  });

  it("rechaza LOCALIDAD sin detalle", () => {
    expect(() => new Ubicacion({ nivel: NivelUbicacion.LOCALIDAD })).toThrow(DomainError);
  });

  it("rechaza un nivel inválido", () => {
    expect(() => new Ubicacion({ nivel: "GALAXIA" })).toThrow(DomainError);
  });
});
