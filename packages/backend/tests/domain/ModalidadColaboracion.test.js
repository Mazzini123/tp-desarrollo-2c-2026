import { describe, it, expect } from "@jest/globals";
import { ModalidadColaboracion } from "../../src/domain/ModalidadColaboracion.js";

describe("ModalidadColaboracion", () => {
  it("sin incentivo ni contratación es gratuita", () => {
    expect(new ModalidadColaboracion().esGratuito()).toBe(true);
  });

  it("con incentivo económico no es gratuita", () => {
    expect(
      new ModalidadColaboracion({ ofreceIncentivoEconomico: true }).esGratuito(),
    ).toBe(false);
  });

  it("con posibilidad de contratación no es gratuita", () => {
    expect(
      new ModalidadColaboracion({ posibilidadDeContratacion: true }).esGratuito(),
    ).toBe(false);
  });
});
