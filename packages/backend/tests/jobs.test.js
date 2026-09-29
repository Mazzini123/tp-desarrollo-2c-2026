import { jest } from "@jest/globals";
import { iniciarCierreAutomatico } from "../src/jobs/cierreAutomatico.js";

describe("Job de cierre automatico", () => {
  test("revisa al arrancar y despues en cada intervalo, y un error no lo frena", async () => {
    jest.useFakeTimers();
    const cerrarVencidos = jest
      .fn()
      .mockRejectedValueOnce(new Error("base caida"))
      .mockResolvedValue([]);
    const errorOriginal = console.error;
    console.error = jest.fn();

    const detener = iniciarCierreAutomatico({ cerrarVencidos }, { intervaloMs: 1000 });
    await jest.advanceTimersByTimeAsync(2500);
    detener();

    expect(cerrarVencidos).toHaveBeenCalledTimes(3);
    expect(console.error).toHaveBeenCalledTimes(1);
    console.error = errorOriginal;
    jest.useRealTimers();
  });
});
