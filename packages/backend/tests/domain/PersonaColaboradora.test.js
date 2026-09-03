import { describe, it, expect } from "@jest/globals";
import { PersonaColaboradora } from "../../src/domain/PersonaColaboradora.js";
import { Habilidad } from "../../src/domain/Habilidad.js";
import { DomainError } from "../../src/domain/DomainError.js";

function crearHabilidadReact() {
  return Habilidad.crear({ titulo: "Desarrollo Web React", descripcion: "" });
}

describe("PersonaColaboradora", () => {
  it("se puede crear solo con nombreDeFantasia", () => {
    const persona = new PersonaColaboradora({
      nombreDeFantasia: "ByteRunner",
      datosDeContacto: "byte@example.com",
    });
    expect(persona.esAnonima()).toBe(true);
    expect(persona.nombreVisible()).toBe("ByteRunner");
  });

  it("se puede crear solo con cuentaDeDesarrollo", () => {
    const persona = new PersonaColaboradora({
      cuentaDeDesarrollo: "github.com/alguien",
      datosDeContacto: "alguien@example.com",
    });
    expect(persona.esAnonima()).toBe(true);
  });

  it("se puede crear con nombre y apellido", () => {
    const persona = new PersonaColaboradora({
      nombre: "Ada",
      apellido: "Lovelace",
      datosDeContacto: "ada@example.com",
    });
    expect(persona.esAnonima()).toBe(false);
    expect(persona.nombreVisible()).toBe("Ada Lovelace");
  });

  it("rechaza crearse sin ningún dato de identificación", () => {
    expect(
      () => new PersonaColaboradora({ datosDeContacto: "x@example.com" }),
    ).toThrow(DomainError);
  });

  it("rechaza crearse con solo nombre sin apellido", () => {
    expect(
      () => new PersonaColaboradora({ nombre: "Ada", datosDeContacto: "x@example.com" }),
    ).toThrow(DomainError);
  });

  it("rechaza crearse sin datosDeContacto", () => {
    expect(
      () => new PersonaColaboradora({ nombreDeFantasia: "ByteRunner", datosDeContacto: "" }),
    ).toThrow(DomainError);
  });

  it("agregarHabilidad agrega una habilidad nueva", () => {
    const persona = new PersonaColaboradora({
      nombreDeFantasia: "ByteRunner",
      datosDeContacto: "byte@example.com",
    });
    const react = crearHabilidadReact();

    persona.agregarHabilidad(react);

    expect(persona.tieneHabilidad(react)).toBe(true);
    expect(persona.habilidades).toHaveLength(1);
  });

  it("agregarHabilidad es idempotente para la misma habilidad", () => {
    const persona = new PersonaColaboradora({
      nombreDeFantasia: "ByteRunner",
      datosDeContacto: "byte@example.com",
    });
    const react = crearHabilidadReact();

    persona.agregarHabilidad(react);
    persona.agregarHabilidad(react);

    expect(persona.habilidades).toHaveLength(1);
  });
});
