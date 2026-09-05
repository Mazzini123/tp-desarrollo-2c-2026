import { describe, it, expect } from "@jest/globals";
import { armarServicios } from "./testHelpers.js";
import { DomainError, ConflictError } from "../../src/errors/index.js";

describe("HabilidadService", () => {
  it("crea una habilidad y calcula su código", () => {
    const { habilidadService } = armarServicios();
    const habilidad = habilidadService.crear({ titulo: "Desarrollo Web React" });

    expect(habilidad.codigo).toBe("desarrollo_web_react");
    expect(habilidadService.listar()).toHaveLength(1);
  });

  it("rechaza dos habilidades con el mismo código", () => {
    const { habilidadService } = armarServicios();
    habilidadService.crear({ titulo: "Desarrollo Web React" });

    expect(() => habilidadService.crear({ titulo: "Desarrollo Web React" })).toThrow(ConflictError);
  });

  it("resolverPorCodigos rechaza un código inexistente", () => {
    const { habilidadService } = armarServicios();

    expect(() => habilidadService.resolverPorCodigos(["balanceo_en_un_pie"])).toThrow(DomainError);
  });

  it("resolverPorCodigos rechaza una habilidad dada de baja", () => {
    const { habilidadService } = armarServicios();
    const habilidad = habilidadService.crear({ titulo: "Desarrollo Node" });
    habilidad.desactivar();

    expect(() => habilidadService.resolverPorCodigos(["desarrollo_node"])).toThrow(DomainError);
  });
});
