import { patronDeNombre } from "../../src/domain/busquedaPorNombre.js";

const coincide = (texto, nombre) => new RegExp(patronDeNombre(texto), "i").test(nombre);

describe("Dominio · patrón de búsqueda por nombre", () => {
  test("ignora mayúsculas y tildes en ambos sentidos", () => {
    expect(coincide("EDUCACION", "Educación Popular")).toBe(true);
    expect(coincide("educación", "EDUCACION popular")).toBe(true);
    expect(coincide("niñas", "Ninas Programadoras")).toBe(true);
  });

  test("acepta una parte del nombre", () => {
    expect(coincide("popu", "Educación Popular")).toBe(true);
    expect(coincide("zzz", "Educación Popular")).toBe(false);
  });

  test("recorta los espacios de los bordes", () => {
    expect(coincide("  popular  ", "Educación Popular")).toBe(true);
  });

  test("trata los caracteres especiales como texto", () => {
    expect(coincide(".*", "Educación Popular")).toBe(false);
    expect(coincide("C++", "Club C++ y más")).toBe(true);
    expect(coincide("(", "Mujeres (TI)")).toBe(true);
    expect(coincide("[a-z]+", "Educación Popular")).toBe(false);
    expect(coincide("a|b", "a|b")).toBe(true);
    expect(coincide("a|b", "a")).toBe(false);
  });
});
