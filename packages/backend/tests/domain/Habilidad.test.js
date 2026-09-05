import { describe, it, expect } from "@jest/globals";
import { Habilidad, normalizarASnakeCase } from "../../src/domain/Habilidad.js";
import { DomainError } from "../../src/errors/index.js";

describe("Habilidad", () => {
  it("normaliza el título a snake_case sin acentos", () => {
    expect(normalizarASnakeCase("Desarrollo Web React")).toBe("desarrollo_web_react");
    expect(normalizarASnakeCase("Diseño UX/UI")).toBe("diseno_ux_ui");
  });

  it("crear calcula el código y arranca activa", () => {
    const habilidad = Habilidad.crear({ titulo: "Desarrollo Web React", descripcion: "" });

    expect(habilidad.codigo).toBe("desarrollo_web_react");
    expect(habilidad.activo).toBe(true);
    expect(habilidad.fechaCreacion).toBeInstanceOf(Date);
  });

  it("rechaza título vacío", () => {
    expect(() => Habilidad.crear({ titulo: "", descripcion: "" })).toThrow(DomainError);
  });

  it("desactivar la marca como inactiva", () => {
    const habilidad = Habilidad.crear({ titulo: "Desarrollo Node", descripcion: "" });
    habilidad.desactivar();

    expect(habilidad.activo).toBe(false);
  });

  it("equals compara por código", () => {
    const a = Habilidad.crear({ titulo: "Desarrollo Node", descripcion: "uno" });
    const b = Habilidad.crear({ titulo: "Desarrollo Node", descripcion: "otro" });

    expect(a.equals(b)).toBe(true);
  });
});
