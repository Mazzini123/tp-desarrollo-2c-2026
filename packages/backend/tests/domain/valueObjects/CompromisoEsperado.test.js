import { describe, it, expect } from "@jest/globals";
import { CompromisoEsperado } from "../../../src/domain/valueObjects/CompromisoEsperado.js";
import { UnidadDeCompromiso } from "../../../src/domain/enums/UnidadDeCompromiso.js";
import { DomainError } from "../../../src/domain/DomainError.js";

describe("CompromisoEsperado", () => {
  it("se construye con unidad y cantidad de horas válidas", () => {
    const compromiso = new CompromisoEsperado({
      unidad: UnidadDeCompromiso.HORAS_MENSUALES,
      cantidadHoras: 15,
    });
    expect(compromiso.unidad).toBe(UnidadDeCompromiso.HORAS_MENSUALES);
    expect(compromiso.cantidadHoras).toBe(15);
  });

  it("rechaza una unidad inválida", () => {
    expect(
      () => new CompromisoEsperado({ unidad: "HORAS_ANUALES", cantidadHoras: 10 }),
    ).toThrow(DomainError);
  });

  it("rechaza cantidadHoras cero o negativa", () => {
    expect(
      () => new CompromisoEsperado({ unidad: UnidadDeCompromiso.HORAS_TOTALES, cantidadHoras: 0 }),
    ).toThrow(DomainError);
    expect(
      () => new CompromisoEsperado({ unidad: UnidadDeCompromiso.HORAS_TOTALES, cantidadHoras: -5 }),
    ).toThrow(DomainError);
  });

  it("rechaza cantidadHoras no entera", () => {
    expect(
      () => new CompromisoEsperado({ unidad: UnidadDeCompromiso.HORAS_TOTALES, cantidadHoras: 2.5 }),
    ).toThrow(DomainError);
  });
});
