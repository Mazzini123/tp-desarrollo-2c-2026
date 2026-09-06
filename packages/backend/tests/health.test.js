import { describe, it, expect, jest } from "@jest/globals";
import { HealthController } from "../src/controllers/HealthController.js";

describe("HealthController", () => {
  it("responde 200 con status ok", () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    new HealthController().check({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",
        data: expect.objectContaining({ status: "ok" }),
      }),
    );
  });
});
