import { describe, it, expect } from "@jest/globals";
import { ModalidadColaboracion } from "../../../src/domain/valueObjects/ModalidadColaboracion.js";

describe("ModalidadColaboracion", () => {
  it("por defecto es únicamente gratuita", () => {
    const modalidad = new ModalidadColaboracion();
    expect(modalidad.esUnicamenteGratuita()).toBe(true);
  });

  it("deja de ser únicamente gratuita si ofrece incentivo económico", () => {
    const modalidad = new ModalidadColaboracion({ ofreceIncentivoEconomico: true });
    expect(modalidad.esUnicamenteGratuita()).toBe(false);
  });

  it("deja de ser únicamente gratuita si hay posibilidad de contratación", () => {
    const modalidad = new ModalidadColaboracion({ posibilidadDeContratacion: true });
    expect(modalidad.esUnicamenteGratuita()).toBe(false);
  });
});
