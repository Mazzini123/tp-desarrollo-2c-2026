import { EventEmitter } from "node:events";
import { jest } from "@jest/globals";
import { registro } from "../../src/config/registro.js";
import { registroDePedidos } from "../../src/middlewares/registroDePedidos.js";
import { noEncontrado } from "../../src/middlewares/noEncontrado.js";
import { NotFoundError } from "../../src/errors/NotFoundError.js";

let salida;
beforeEach(() => {
  salida = { log: console.log, error: console.error };
  console.log = jest.fn();
  console.error = jest.fn();
});
afterEach(() => {
  console.log = salida.log;
  console.error = salida.error;
});

const lineaEscrita = (espia) => JSON.parse(espia.mock.calls[0][0]);

test("cada evento se escribe como una linea JSON con fecha, nivel y datos", () => {
  registro.error("envio_fallido", { canal: "EMAIL" });

  expect(lineaEscrita(console.error)).toMatchObject({
    nivel: "error",
    evento: "envio_fallido",
    canal: "EMAIL",
    fecha: expect.any(String),
  });
});

test("registra cada pedido al terminar, con su estado y duracion", () => {
  const res = Object.assign(new EventEmitter(), { statusCode: 201 });
  const req = {
    id: "r1",
    method: "POST",
    path: "/colectivos",
    originalUrl: "/colectivos",
  };
  const next = jest.fn();

  registroDePedidos(req, res, next);
  expect(console.log).not.toHaveBeenCalled();
  res.emit("finish");

  expect(next).toHaveBeenCalled();
  expect(lineaEscrita(console.log)).toMatchObject({
    evento: "pedido_http",
    requestId: "r1",
    metodo: "POST",
    ruta: "/colectivos",
    estado: 201,
    ms: expect.any(Number),
  });
});

test("no registra los chequeos de salud", () => {
  const res = new EventEmitter();
  registroDePedidos({ path: "/health" }, res, () => {});
  res.emit("finish");

  expect(console.log).not.toHaveBeenCalled();
});

test("una ruta inexistente pasa un NotFoundError al manejador de errores", () => {
  const next = jest.fn();

  noEncontrado({}, {}, next);

  expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
});
