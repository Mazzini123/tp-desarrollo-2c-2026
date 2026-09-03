import { describe, it, expect } from "@jest/globals";
import { Habilidad, normalizarATituloSnakeCase } from "../../src/domain/Habilidad.js";
import { DomainError } from "../../src/domain/DomainError.js";

describe("Habilidad", () => {
  it("crear() calcula el código a partir del título en snake_case", () => {
    const habilidad = Habilidad.crear({
      titulo: "Desarrollo Web React",
      descripcion: "Construcción de interfaces con React",
    });
    expect(habilidad.codigo).toBe("desarrollo_web_react");
    expect(habilidad.titulo).toBe("Desarrollo Web React");
  });

  it("normaliza acentos y espacios múltiples", () => {
    expect(normalizarATituloSnakeCase("Análisis   de Datos")).toBe("analisis_de_datos");
  });

  it("rechaza construir sin título", () => {
    expect(() => new Habilidad({ codigo: "x", titulo: "", descripcion: "" })).toThrow(
      DomainError,
    );
  });

  it("dos habilidades con el mismo código son iguales", () => {
    const a = Habilidad.crear({ titulo: "Testing E2E", descripcion: "" });
    const b = Habilidad.crear({ titulo: "Testing E2E", descripcion: "otra descripción" });
    expect(a.equals(b)).toBe(true);
  });
});
