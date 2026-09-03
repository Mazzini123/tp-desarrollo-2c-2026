import { describe, it, expect } from "@jest/globals";
import { Colaboracion } from "../../src/domain/Colaboracion.js";
import { DomainError } from "../../src/domain/DomainError.js";

describe("Colaboracion", () => {
  it("se crea con proyectoId, personaColaboradoraId y fecha por defecto", () => {
    const colaboracion = new Colaboracion({
      proyectoId: "proyecto-1",
      personaColaboradoraId: "persona-1",
    });

    expect(colaboracion.proyectoId).toBe("proyecto-1");
    expect(colaboracion.personaColaboradoraId).toBe("persona-1");
    expect(colaboracion.fechaDeInicio).toBeInstanceOf(Date);
    expect(colaboracion.id).toBeDefined();
  });

  it("acepta una fechaDeInicio explícita", () => {
    const fecha = new Date("2026-01-15T00:00:00.000Z");
    const colaboracion = new Colaboracion({
      proyectoId: "proyecto-1",
      personaColaboradoraId: "persona-1",
      fechaDeInicio: fecha,
    });

    expect(colaboracion.fechaDeInicio).toBe(fecha);
  });

  it("rechaza crearse sin proyectoId", () => {
    expect(
      () => new Colaboracion({ personaColaboradoraId: "persona-1" }),
    ).toThrow(DomainError);
  });

  it("rechaza crearse sin personaColaboradoraId", () => {
    expect(
      () => new Colaboracion({ proyectoId: "proyecto-1" }),
    ).toThrow(DomainError);
  });

  it("rechaza una fechaDeInicio inválida", () => {
    expect(
      () =>
        new Colaboracion({
          proyectoId: "proyecto-1",
          personaColaboradoraId: "persona-1",
          fechaDeInicio: new Date("no es una fecha"),
        }),
    ).toThrow(DomainError);
  });
});
