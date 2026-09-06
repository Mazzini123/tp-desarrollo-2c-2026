import { describe, it, expect } from "@jest/globals";
import { BaseController } from "../../src/controllers/BaseController.js";
import { BadRequestError } from "../../src/errors/index.js";

const controller = new BaseController();

describe("extraerPaginacion", () => {
  it("pone los valores por defecto si no vienen", () => {
    expect(controller.extraerPaginacion({})).toEqual({
      numeroPagina: 1,
      limitePorPagina: 10,
    });
  });

  it("convierte los strings de la query a números", () => {
    expect(controller.extraerPaginacion({ page: "2", limit: "5" })).toEqual({
      numeroPagina: 2,
      limitePorPagina: 5,
    });
  });

  it("rechaza page que no sea entero positivo", () => {
    expect(() => controller.extraerPaginacion({ page: "0" })).toThrow(BadRequestError);
    expect(() => controller.extraerPaginacion({ page: "-1" })).toThrow(BadRequestError);
    expect(() => controller.extraerPaginacion({ page: "abc" })).toThrow(BadRequestError);
    expect(() => controller.extraerPaginacion({ page: "1.5" })).toThrow(BadRequestError);
  });

  it("rechaza limit inválido", () => {
    expect(() => controller.extraerPaginacion({ limit: "0" })).toThrow(BadRequestError);
  });
});
