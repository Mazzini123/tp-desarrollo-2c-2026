import mongoose from "mongoose";
import { aplicarFormatoJSON } from "../../src/models/formatoJSON.js";

describe("Formato JSON con lista de campos permitidos", () => {
  test("solo publica los campos declarados, aunque el esquema tenga mas", () => {
    const schema = new mongoose.Schema({ nombre: String, secreto: String });
    aplicarFormatoJSON(schema, { campos: ["id", "nombre"] });
    const Modelo = mongoose.model("PruebaFormatoJSON", schema);

    const json = new Modelo({ nombre: "Ada", secreto: "no sale" }).toJSON();

    expect(Object.keys(json).sort()).toEqual(["id", "nombre"]);
  });

  test("sin lista de campos no se puede configurar", () => {
    expect(() => aplicarFormatoJSON(new mongoose.Schema({}))).toThrow();
  });
});
