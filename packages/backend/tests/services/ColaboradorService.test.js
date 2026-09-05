import { describe, it, expect } from "@jest/globals";
import { armarServicios, prepararCatalogo, crearColaboradorDeEjemplo } from "./testHelpers.js";
import { DomainError } from "../../src/domain/DomainError.js";
import { NotFoundError } from "../../src/errors/NotFoundError.js";

describe("ColaboradorService", () => {
  it("crea un colaborador con habilidades del catálogo", () => {
    const { habilidadService, colaboradorService } = armarServicios();
    prepararCatalogo(habilidadService);

    const colaborador = crearColaboradorDeEjemplo(colaboradorService, {
      habilidades: ["desarrollo_web_react"],
    });

    expect(colaborador.habilidades).toHaveLength(1);
  });

  it("rechaza una habilidad fuera del catálogo", () => {
    const { colaboradorService } = armarServicios();

    expect(() =>
      crearColaboradorDeEjemplo(colaboradorService, { habilidades: ["inventada"] }),
    ).toThrow(DomainError);
  });

  it("buscarPorId lanza NotFoundError si no existe", () => {
    const { colaboradorService } = armarServicios();

    expect(() => colaboradorService.buscarPorId("no-existe")).toThrow(NotFoundError);
  });

  it("actualizar cambia pronombres y presentación", () => {
    const { colaboradorService } = armarServicios();
    const colaborador = crearColaboradorDeEjemplo(colaboradorService);

    const actualizado = colaboradorService.actualizar(colaborador.id, {
      pronombres: ["elle"],
      presentacion: "Dev hace 3 años",
    });

    expect(actualizado.pronombres).toEqual(["elle"]);
    expect(actualizado.presentacion).toBe("Dev hace 3 años");
  });
});
