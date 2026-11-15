import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { configuracionDeProceso, proxiesConfiables } from "../../src/config/entorno.js";
import { registrarApagado } from "../../src/config/apagado.js";
import { iniciarTareaPeriodica } from "../../src/jobs/tareaPeriodica.js";

test.each([
  ["SERVER_PORT", "-1"],
  ["SERVER_PORT", "65536"],
  ["SERVER_PORT", "NaN"],
  ["CIERRE_AUTOMATICO_INTERVALO_MS", "0"],
  ["ENVIOS_INTERVALO_MS", "1.5"],
  ["APAGADO_PLAZO_MS", "Infinity"],
  ["ENVIOS_INTERVALO_MS", "2147483648"],
])("rechaza %s inválido al arrancar: %s", (campo, valor) => {
  expect(() => configuracionDeProceso({ [campo]: valor })).toThrow(campo);
});

test("solo confía en proxies explícitos, sin habilitar cualquier IP", () => {
  expect(proxiesConfiables({})).toBe(false);
  expect(proxiesConfiables({ TRUST_PROXY: "127.0.0.1,10.0.0.0/8,::1" })).toEqual([
    "127.0.0.1",
    "10.0.0.0/8",
    "::1",
  ]);
  expect(() => proxiesConfiables({ TRUST_PROXY: "true" })).toThrow();
  expect(() => proxiesConfiables({ TRUST_PROXY: "10.0.0.0/99" })).toThrow();
});

const codigoAnterior = process.exitCode;
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
  process.exitCode = codigoAnterior;
});

test("el apagado detiene HTTP y jobs antes de cerrar la base, una sola vez", async () => {
  jest.useFakeTimers();
  jest.spyOn(process, "once").mockReturnValue(process);
  const salir = jest.spyOn(process, "exit").mockImplementation(() => {});
  const desconectar = jest.spyOn(mongoose, "disconnect").mockResolvedValue();
  let terminarHttp, terminarJob;
  const servidor = {
    close: jest.fn((callback) => {
      terminarHttp = callback;
    }),
  };
  const trabajo = new Promise((resolver) => {
    terminarJob = resolver;
  });
  const detener = jest.fn(() => trabajo);
  const apagar = registrarApagado({ servidor, detenerTareas: [detener] });
  const fin = apagar("SIGTERM");
  await apagar("SIGINT");
  expect(servidor.close).toHaveBeenCalledTimes(1);
  expect(detener).toHaveBeenCalledTimes(1);
  terminarHttp();
  await Promise.resolve();
  expect(desconectar).not.toHaveBeenCalled();
  terminarJob();
  await fin;
  expect(desconectar).toHaveBeenCalledTimes(1);
  expect(salir).not.toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(25_000);
  expect(salir).toHaveBeenCalledWith(1);
});

test("detener un job avisa que debe terminar y espera la ejecución activa", async () => {
  jest.useFakeTimers();
  let terminar, debeDetenerse;
  const tarea = jest.fn((comprobar) => {
    debeDetenerse = comprobar;
    return new Promise((resolver) => {
      terminar = resolver;
    });
  });
  const detener = iniciarTareaPeriodica("prueba", tarea, { intervaloMs: 100 });
  expect(debeDetenerse()).toBe(false);
  const fin = detener();
  expect(debeDetenerse()).toBe(true);
  terminar();
  await fin;
  await jest.advanceTimersByTimeAsync(1000);
  expect(tarea).toHaveBeenCalledTimes(1);
});
