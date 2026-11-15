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

  test("no arranca una revision mientras la anterior sigue corriendo", async () => {
    jest.useFakeTimers();
    let enCurso = 0;
    let maximoEnParalelo = 0;
    const cerrarVencidos = jest.fn(async () => {
      enCurso++;
      maximoEnParalelo = Math.max(maximoEnParalelo, enCurso);
      // Cada revision tarda mas que el intervalo.
      await new Promise((resolver) => setTimeout(resolver, 2500));
      enCurso--;
      return [];
    });

    const detener = iniciarCierreAutomatico({ cerrarVencidos }, { intervaloMs: 1000 });
    await jest.advanceTimersByTimeAsync(3000);
    expect(cerrarVencidos).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(3000);
    detener();

    expect(cerrarVencidos).toHaveBeenCalledTimes(2);
    expect(maximoEnParalelo).toBe(1);
    jest.useRealTimers();
  });
});
