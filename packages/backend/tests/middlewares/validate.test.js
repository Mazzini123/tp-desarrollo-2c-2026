import { describe, it, expect, jest } from "@jest/globals";
import { z } from "zod";
import { validate } from "../../src/middlewares/validate.js";

const schema = z
  .object({ nombre: z.string().min(1), edad: z.int().positive() })
  .strict();

function armarRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() };
}

describe("validate", () => {
  it("llama a next y deja el body parseado si es válido", () => {
    const req = { body: { nombre: "Ada", edad: 36 } };
    const res = armarRes();
    const next = jest.fn();

    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ nombre: "Ada", edad: 36 });
  });

  it("responde 400 con los issues si falta un campo", () => {
    const req = { body: { nombre: "Ada" } };
    const res = armarRes();
    const next = jest.fn();

    validate(schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ issues: expect.any(Array) }),
    );
  });

  it("responde 400 si un tipo no coincide", () => {
    const req = { body: { nombre: "Ada", edad: "treinta" } };
    const res = armarRes();
    const next = jest.fn();

    validate(schema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rechaza campos de más porque el schema es strict", () => {
    const req = { body: { nombre: "Ada", edad: 36, sobrante: true } };
    const res = armarRes();
    const next = jest.fn();

    validate(schema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});
