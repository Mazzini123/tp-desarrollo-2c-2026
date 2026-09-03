import { describe, it, expect } from "@jest/globals";
import { armarServicios } from "./testHelpers.js";
import { DomainError } from "../../src/domain/DomainError.js";

describe("HabilidadService", () => {
  it("crea una habilidad y calcula su código", () => {
    const { habilidadService } = armarServicios();

    const habilidad = habilidadService.crear({
      titulo: "Desarrollo Web React",
      descripcion: "Frontend con React",
    });

    expect(habilidad.codigo).toBe("desarrollo_web_react");
    expect(habilidadService.listar()).toHaveLength(1);
  });

  it("rechaza crear dos habilidades con el mismo código", () => {
    const { habilidadService } = armarServicios();
    habilidadService.crear({ titulo: "Desarrollo Web React", descripcion: "" });

    expect(() =>
      habilidadService.crear({ titulo: "Desarrollo Web React", descripcion: "otra" }),
    ).toThrow(DomainError);
  });

  it("resolverPorCodigos rechaza un código que no existe en el catálogo", () => {
    const { habilidadService } = armarServicios();
    habilidadService.crear({ titulo: "Desarrollo Web React", descripcion: "" });

    expect(() => habilidadService.resolverPorCodigos(["balanceo_en_un_pie"])).toThrow(
      DomainError,
    );
  });

  it("resolverPorCodigos devuelve las habilidades del catálogo", () => {
    const { habilidadService } = armarServicios();
    habilidadService.crear({ titulo: "Desarrollo Web React", descripcion: "" });

    const [habilidad] = habilidadService.resolverPorCodigos(["desarrollo_web_react"]);

    expect(habilidad.titulo).toBe("Desarrollo Web React");
  });
});
