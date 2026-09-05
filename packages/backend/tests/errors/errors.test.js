import { describe, it, expect } from "@jest/globals";
import {
  AppError,
  DomainError,
  NotFoundError,
  ConflictError,
} from "../../src/errors/index.js";

describe("Jerarquía de errores", () => {
  it("todas las subclases son AppError y Error", () => {
    for (const Error_ of [DomainError, NotFoundError, ConflictError]) {
      const error = new Error_("mensaje");
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    }
  });

  it("cada subclase trae su propio status", () => {
    expect(new DomainError("x").status).toBe(400);
    expect(new NotFoundError("x").status).toBe(404);
    expect(new ConflictError("x").status).toBe(409);
  });

  it("name toma el nombre de la clase concreta", () => {
    expect(new DomainError("x").name).toBe("DomainError");
    expect(new NotFoundError("x").name).toBe("NotFoundError");
    expect(new ConflictError("x").name).toBe("ConflictError");
  });

  it("conserva el mensaje", () => {
    expect(new ConflictError("ya existe").message).toBe("ya existe");
  });
});
