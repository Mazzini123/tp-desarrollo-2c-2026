import { describe, it, expect } from "@jest/globals";
import { armarServicios, crearPersonaDeEjemplo } from "./testHelpers.js";
import { DomainError } from "../../src/domain/DomainError.js";
import { NotFoundError } from "../../src/errors/NotFoundError.js";

describe("PersonaColaboradoraService", () => {
  it("crea una persona con habilidades del catálogo", () => {
    const { habilidadService, personaColaboradoraService } = armarServicios();
    habilidadService.crear({ titulo: "Desarrollo Web React", descripcion: "" });

    const persona = crearPersonaDeEjemplo(personaColaboradoraService, {
      habilidades: ["desarrollo_web_react"],
    });

    expect(persona.habilidades).toHaveLength(1);
  });

  it("rechaza crear una persona con una habilidad que no existe en el catálogo", () => {
    const { personaColaboradoraService } = armarServicios();

    expect(() =>
      crearPersonaDeEjemplo(personaColaboradoraService, {
        habilidades: ["habilidad_inexistente"],
      }),
    ).toThrow(DomainError);
  });

  it("buscarPorId lanza NotFoundError si no existe", () => {
    const { personaColaboradoraService } = armarServicios();

    expect(() => personaColaboradoraService.buscarPorId("no-existe")).toThrow(NotFoundError);
  });

  it("actualizar modifica pronombres y presentación", () => {
    const { personaColaboradoraService } = armarServicios();
    const persona = crearPersonaDeEjemplo(personaColaboradoraService);

    const actualizada = personaColaboradoraService.actualizar(persona.id, {
      pronombres: "elle",
      presentacion: "Devx hace 3 años",
    });

    expect(actualizada.pronombres).toBe("elle");
    expect(actualizada.presentacion).toBe("Devx hace 3 años");
  });
});
