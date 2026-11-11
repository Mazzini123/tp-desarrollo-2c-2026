import { HabilidadModel } from "../../src/models/HabilidadModel.js";
import { manejadorErrores } from "../../src/middlewares/manejadorErrores.js";
import { DomainError } from "../../src/errors/DomainError.js";

function responder(error) {
  const respuesta = { codigo: null, cuerpo: null };
  const res = {
    status(codigo) {
      respuesta.codigo = codigo;
      return this;
    },
    json(cuerpo) {
      respuesta.cuerpo = cuerpo;
    },
  };
  manejadorErrores(error, { id: "pedido" }, res, () => {});
  return respuesta;
}

test("una regla de negocio responde 422 con su mensaje", () => {
  expect(responder(new DomainError("La fecha de cierre tiene que ser futura"))).toEqual({
    codigo: 422,
    cuerpo: { message: "La fecha de cierre tiene que ser futura" },
  });
});

test("un error de validacion del ODM responde 400 con un mensaje por campo", () => {
  const error = new HabilidadModel({}).validateSync();

  const { codigo, cuerpo } = responder(error);

  expect(codigo).toBe(400);
  expect(cuerpo.message).toBe("Datos invalidos");
  expect(cuerpo.detalle).toEqual(expect.arrayContaining([expect.any(String)]));
  expect(cuerpo.detalle.join(" ")).not.toMatch(/validation failed/);
});
