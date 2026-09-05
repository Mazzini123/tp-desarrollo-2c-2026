import { describe, it, expect } from "@jest/globals";
import { Compromiso } from "../../src/domain/Compromiso.js";
import { PERIODO_COMPROMISO } from "../../src/domain/enums/PeriodoCompromiso.js";
import { DomainError } from "../../src/errors/index.js";

describe("Compromiso", () => {
  it("se crea con horas positivas y período válido", () => {
    const compromiso = new Compromiso({
      cantidadHoras: 5,
      periodo: PERIODO_COMPROMISO.HS_SEMANALES,
    });

    expect(compromiso.cantidadHoras).toBe(5);
    expect(compromiso.periodo).toBe(PERIODO_COMPROMISO.HS_SEMANALES);
  });

  it("rechaza horas negativas o cero", () => {
    expect(
      () => new Compromiso({ cantidadHoras: 0, periodo: PERIODO_COMPROMISO.HS_TOTALES }),
    ).toThrow(DomainError);
  });

  it("rechaza un período inválido", () => {
    expect(() => new Compromiso({ cantidadHoras: 5, periodo: "HS_ANUALES" })).toThrow(
      DomainError,
    );
  });
});
