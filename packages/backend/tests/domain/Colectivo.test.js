import { describe, it, expect } from "@jest/globals";
import { Colectivo } from "../../src/domain/Colectivo.js";
import { Ubicacion } from "../../src/domain/valueObjects/Ubicacion.js";
import { TipoDeColectivo } from "../../src/domain/enums/TipoDeColectivo.js";
import { NivelUbicacion } from "../../src/domain/enums/NivelUbicacion.js";
import { DomainError } from "../../src/domain/DomainError.js";

function datosValidos(overrides = {}) {
  return {
    nombre: "Fundación Ejemplo",
    descripcion: "Trabajamos por una causa",
    tipo: TipoDeColectivo.FUNDACION,
    ...overrides,
  };
}

describe("Colectivo", () => {
  it("se crea con datos válidos, sin ubicación", () => {
    const colectivo = new Colectivo(datosValidos());

    expect(colectivo.nombre).toBe("Fundación Ejemplo");
    expect(colectivo.tipo).toBe(TipoDeColectivo.FUNDACION);
    expect(colectivo.ubicacion).toBeNull();
    expect(colectivo.id).toBeDefined();
  });

  it("se crea con ubicación", () => {
    const ubicacion = new Ubicacion({ nivel: NivelUbicacion.CABA });
    const colectivo = new Colectivo(datosValidos({ ubicacion }));

    expect(colectivo.ubicacion).toBe(ubicacion);
  });

  it("rechaza nombre vacío", () => {
    expect(() => new Colectivo(datosValidos({ nombre: "" }))).toThrow(DomainError);
  });

  it("rechaza tipo inválido", () => {
    expect(() => new Colectivo(datosValidos({ tipo: "COOPERATIVA" }))).toThrow(DomainError);
  });

  it("rechaza ubicacion que no sea instancia de Ubicacion", () => {
    expect(() => new Colectivo(datosValidos({ ubicacion: { nivel: "CABA" } }))).toThrow(
      DomainError,
    );
  });

  it("actualizarDatos permite cambiar nombre, descripcion y ubicacion", () => {
    const colectivo = new Colectivo(datosValidos());
    const nuevaUbicacion = new Ubicacion({ nivel: NivelUbicacion.ARGENTINA });

    colectivo.actualizarDatos({
      nombre: "Nuevo nombre",
      descripcion: "Nueva descripción",
      ubicacion: nuevaUbicacion,
    });

    expect(colectivo.nombre).toBe("Nuevo nombre");
    expect(colectivo.descripcion).toBe("Nueva descripción");
    expect(colectivo.ubicacion).toBe(nuevaUbicacion);
  });

  it("actualizarDatos no toca el tipo", () => {
    const colectivo = new Colectivo(datosValidos());
    colectivo.actualizarDatos({ nombre: "Otro nombre" });

    expect(colectivo.tipo).toBe(TipoDeColectivo.FUNDACION);
  });

  it("actualizarDatos rechaza nombre vacío", () => {
    const colectivo = new Colectivo(datosValidos());
    expect(() => colectivo.actualizarDatos({ nombre: "" })).toThrow(DomainError);
  });
});
