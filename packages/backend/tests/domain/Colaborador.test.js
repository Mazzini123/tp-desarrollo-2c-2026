import { Colaborador } from "../../src/domain/Colaborador.js";
import { Habilidad } from "../../src/domain/Habilidad.js";
import { ConflictError } from "../../src/errors/ConflictError.js";

// Correccion C1: los pronombres son una lista y la unicidad la garantiza la
// logica del dominio, no el tipo del atributo.
describe("Colaborador · pronombres", () => {
  let colaborador;

  beforeEach(() => {
    colaborador = new Colaborador({ cuentaGit: "octocat" });
  });

  test("arranca con una lista vacia, no con un Set", () => {
    expect(Array.isArray(colaborador.pronombres)).toBe(true);
    expect(colaborador.pronombres).toEqual([]);
  });

  test("agrega un pronombre nuevo", () => {
    colaborador.agregarPronombre("elle");
    expect(colaborador.pronombres).toEqual(["elle"]);
  });

  test("agregar uno repetido tira ConflictError", () => {
    colaborador.agregarPronombre("elle");
    expect(() => colaborador.agregarPronombre("elle")).toThrow(ConflictError);
    expect(colaborador.pronombres).toEqual(["elle"]);
  });

  test("reemplazar la lista completa deduplica en silencio", () => {
    colaborador.reemplazarPronombres(["ella", "elle", "ella"]);
    expect(colaborador.pronombres).toEqual(["ella", "elle"]);
  });

  test("quitar uno que no esta no es error", () => {
    colaborador.agregarPronombre("el");
    colaborador.quitarPronombre("elle");
    expect(colaborador.pronombres).toEqual(["el"]);
  });

  // Esta es la razon concreta por la que el profesor avisó que el Set iba a
  // dar problemas con Mongo: un Set no tiene propiedades enumerables propias,
  // asi que se serializa como {} y los datos se pierden sin ningun error.
  test("la lista sobrevive a un round-trip por JSON; un Set no lo haria", () => {
    colaborador.reemplazarPronombres(["ella", "elle"]);
    const idaYVuelta = JSON.parse(JSON.stringify(colaborador));
    expect(idaYVuelta.pronombres).toEqual(["ella", "elle"]);
    expect(JSON.parse(JSON.stringify({ x: new Set(["ella"]) })).x).toEqual({});
  });
});

describe("Colaborador · habilidades", () => {
  const node = new Habilidad({ titulo: "Desarrollo Node" });

  test("agregar la misma habilidad dos veces no la duplica", () => {
    const colaborador = new Colaborador({ cuentaGit: "octocat" });
    colaborador.agregarHabilidad(node);
    colaborador.agregarHabilidad(new Habilidad({ titulo: "Desarrollo Node" }));
    expect(colaborador.habilidades).toHaveLength(1);
  });

  test("tieneHabilidad compara por codigo, no por identidad", () => {
    const colaborador = new Colaborador({ cuentaGit: "octocat" });
    colaborador.agregarHabilidad(node);
    expect(colaborador.tieneHabilidad(new Habilidad({ titulo: "desarrollo node" }))).toBe(true);
  });
});
