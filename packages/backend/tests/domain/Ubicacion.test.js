import { describe, it, expect } from "@jest/globals";
import { Ubicacion } from "../../src/domain/Ubicacion.js";
import { TIPO_UBICACION } from "../../src/domain/enums/TipoUbicacion.js";
import { DomainError } from "../../src/domain/DomainError.js";

describe("Ubicacion", () => {
  it("ARGENTINA es de alcance nacional y no usa nombre", () => {
    const ubicacion = new Ubicacion({ tipoUbicacion: TIPO_UBICACION.ARGENTINA });

    expect(ubicacion.esDeAlcanceNacional()).toBe(true);
    expect(ubicacion.nombre).toBeNull();
  });

  it("CABA no usa nombre y no es nacional", () => {
    const ubicacion = new Ubicacion({ tipoUbicacion: TIPO_UBICACION.CABA, nombre: "algo" });

    expect(ubicacion.nombre).toBeNull();
    expect(ubicacion.esDeAlcanceNacional()).toBe(false);
  });

  it("PROVINCIA acepta una de las 23 provincias", () => {
    const ubicacion = new Ubicacion({
      tipoUbicacion: TIPO_UBICACION.PROVINCIA,
      nombre: "Mendoza",
    });

    expect(ubicacion.nombre).toBe("Mendoza");
  });

  it("PROVINCIA rechaza un nombre que no es provincia", () => {
    expect(
      () => new Ubicacion({ tipoUbicacion: TIPO_UBICACION.PROVINCIA, nombre: "Springfield" }),
    ).toThrow(DomainError);
  });

  it("LOCALIDAD acepta texto libre pero no vacío", () => {
    expect(
      new Ubicacion({ tipoUbicacion: TIPO_UBICACION.LOCALIDAD, nombre: "Avellaneda" }).nombre,
    ).toBe("Avellaneda");

    expect(() => new Ubicacion({ tipoUbicacion: TIPO_UBICACION.LOCALIDAD })).toThrow(DomainError);
  });

  it("rechaza un tipo inválido", () => {
    expect(() => new Ubicacion({ tipoUbicacion: "CONTINENTE" })).toThrow(DomainError);
  });
});
