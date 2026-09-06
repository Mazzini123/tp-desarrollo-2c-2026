import { describe, it, expect } from "@jest/globals";
import { tieneContenido, esValorDeEnum } from "../../src/utils/validaciones.js";

describe("tieneContenido", () => {
  it("es true para un string con contenido real", () => {
    expect(tieneContenido("Fundación")).toBe(true);
  });

  it("es false para vacío, sólo espacios, null y undefined", () => {
    expect(tieneContenido("")).toBe(false);
    expect(tieneContenido("   ")).toBe(false);
    expect(tieneContenido(null)).toBe(false);
    expect(tieneContenido(undefined)).toBe(false);
  });
});

describe("esValorDeEnum", () => {
  const COLORES = Object.freeze({ ROJO: "ROJO", VERDE: "VERDE" });

  it("reconoce un valor del enumerativo", () => {
    expect(esValorDeEnum(COLORES, "ROJO")).toBe(true);
  });

  it("rechaza uno que no está", () => {
    expect(esValorDeEnum(COLORES, "AZUL")).toBe(false);
  });
});
