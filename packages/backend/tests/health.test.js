import { jest, describe, it, expect } from "@jest/globals";
import { healthCheck } from "../src/controllers/health.controller.js";

describe("healthCheck", () => {
  it("responde 200 con status ok", () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    healthCheck({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ok" }),
    );
  });
});
