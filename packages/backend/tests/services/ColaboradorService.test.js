import { armarServices, CODIGOS } from "../fixtures.js";
import { DomainError } from "../../src/errors/DomainError.js";
import { ConflictError } from "../../src/errors/ConflictError.js";
import { NotFoundError } from "../../src/errors/NotFoundError.js";

describe("ColaboradorService · identificacion", () => {
  let colaboradorService;

  beforeEach(() => {
    colaboradorService = armarServices().colaboradorService;
  });

  test("sin ningun dato de identificacion no se puede crear", () => {
    expect(() => colaboradorService.crear({})).toThrow(DomainError);
  });

  test("solo con nombre, sin apellido, tampoco alcanza", () => {
    expect(() => colaboradorService.crear({ nombre: "Ada" })).toThrow(DomainError);
  });

  test.each([
    ["nombreFantasia", { nombreFantasia: "ada" }],
    ["cuentaGit", { cuentaGit: "ada" }],
    ["nombre + apellido", { nombre: "Ada", apellido: "Lovelace" }],
  ])("alcanza con %s", (_caso, datos) => {
    expect(colaboradorService.crear(datos).id).toBeDefined();
  });

  test("buscar un id que no existe tira NotFoundError", () => {
    expect(() => colaboradorService.buscarPorId("no-existe")).toThrow(NotFoundError);
  });
});

describe("ColaboradorService · pronombres", () => {
  let colaboradorService;
  let colaborador;

  beforeEach(() => {
    colaboradorService = armarServices().colaboradorService;
    colaborador = colaboradorService.crear({ cuentaGit: "ada", pronombres: ["ella"] });
  });

  test("el alta deduplica los pronombres del payload", () => {
    const otro = colaboradorService.crear({
      cuentaGit: "grace",
      pronombres: ["ella", "ella", "elle"],
    });
    expect(otro.pronombres).toEqual(["ella", "elle"]);
  });

  test("agregar de a uno repetido tira ConflictError", () => {
    expect(() => colaboradorService.agregarPronombre(colaborador.id, "ella")).toThrow(
      ConflictError,
    );
  });

  test("agregar de a uno nuevo lo suma", () => {
    const actualizado = colaboradorService.agregarPronombre(colaborador.id, "elle");
    expect(actualizado.pronombres).toEqual(["ella", "elle"]);
  });

  test("el PUT reemplaza la lista completa y no se queja de duplicados", () => {
    const actualizado = colaboradorService.actualizar(colaborador.id, {
      pronombres: ["el", "el", "elle"],
    });
    expect(actualizado.pronombres).toEqual(["el", "elle"]);
  });
});

describe("ColaboradorService · habilidades", () => {
  let colaboradorService;

  beforeEach(() => {
    colaboradorService = armarServices().colaboradorService;
  });

  test("un codigo de habilidad que no existe tira NotFoundError", () => {
    expect(() =>
      colaboradorService.crear({ cuentaGit: "ada", codigosHabilidades: ["inventada"] }),
    ).toThrow(NotFoundError);
  });

  test("agregar la misma habilidad dos veces es idempotente", () => {
    const colaborador = colaboradorService.crear({ cuentaGit: "ada" });
    colaboradorService.agregarHabilidad(colaborador.id, CODIGOS.node);
    const final = colaboradorService.agregarHabilidad(colaborador.id, CODIGOS.node);
    expect(final.habilidades).toHaveLength(1);
  });
});
