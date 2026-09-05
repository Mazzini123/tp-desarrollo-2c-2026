import { describe, it, expect } from "@jest/globals";
import { Colaboracion } from "../../src/domain/Colaboracion.js";
import { Colaborador } from "../../src/domain/Colaborador.js";
import { DomainError } from "../../src/errors/index.js";

describe("Colaboracion", () => {
  it("se crea con un colaborador y fecha por defecto", () => {
    const colaborador = new Colaborador({ nombreFantasia: "ByteRunner" });
    const colaboracion = new Colaboracion({ colaborador });

    expect(colaboracion.colaborador).toBe(colaborador);
    expect(colaboracion.fecha).toBeInstanceOf(Date);
  });

  it("rechaza crearse sin colaborador", () => {
    expect(() => new Colaboracion({})).toThrow(DomainError);
  });

  it("rechaza un colaborador que no sea instancia de Colaborador", () => {
    expect(() => new Colaboracion({ colaborador: { id: "x" } })).toThrow(DomainError);
  });
});
