import { describe, it, expect } from "@jest/globals";
import { Colaborador } from "../../src/domain/Colaborador.js";
import { Habilidad } from "../../src/domain/Habilidad.js";
import { DomainError } from "../../src/errors/index.js";

function react() {
  return Habilidad.crear({ titulo: "Desarrollo Web React", descripcion: "" });
}

describe("Colaborador", () => {
  it("se puede crear solo con nombreFantasia", () => {
    const colaborador = new Colaborador({ nombreFantasia: "ByteRunner" });
    expect(colaborador.nombreFantasia).toBe("ByteRunner");
    expect(colaborador.id).toBeDefined();
  });

  it("se puede crear solo con cuentaGit", () => {
    expect(new Colaborador({ cuentaGit: "github.com/alguien" }).cuentaGit).toBe(
      "github.com/alguien",
    );
  });

  it("se puede crear con nombre y apellido", () => {
    const colaborador = new Colaborador({ nombre: "Ada", apellido: "Lovelace" });
    expect(colaborador.nombre).toBe("Ada");
  });

  it("rechaza crearse sin ningún dato de identificación", () => {
    expect(() => new Colaborador({})).toThrow(DomainError);
  });

  it("rechaza crearse con solo nombre sin apellido", () => {
    expect(() => new Colaborador({ nombre: "Ada" })).toThrow(DomainError);
  });

  it("pronombres es una lista", () => {
    const colaborador = new Colaborador({
      nombreFantasia: "ByteRunner",
      pronombres: ["elle", "le"],
    });
    expect(colaborador.pronombres).toEqual(["elle", "le"]);
  });

  it("agregarHabilidad es idempotente", () => {
    const colaborador = new Colaborador({ nombreFantasia: "ByteRunner" });
    colaborador.agregarHabilidad(react());
    colaborador.agregarHabilidad(react());

    expect(colaborador.habilidades).toHaveLength(1);
    expect(colaborador.tieneHabilidad(react())).toBe(true);
  });

  it("quitarHabilidad la saca", () => {
    const colaborador = new Colaborador({ nombreFantasia: "ByteRunner" });
    colaborador.agregarHabilidad(react());
    colaborador.quitarHabilidad(react());

    expect(colaborador.habilidades).toHaveLength(0);
  });
});
