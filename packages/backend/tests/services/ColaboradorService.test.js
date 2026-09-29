import { armarServices, CODIGOS } from "../fixtures.js";
import { DomainError } from "../../src/errors/DomainError.js";
import { ConflictError } from "../../src/errors/ConflictError.js";
import { NotFoundError } from "../../src/errors/NotFoundError.js";

describe("ColaboradorService · identificacion", () => {
  let colaboradorService;

  beforeEach(async () => {
    colaboradorService = (await armarServices()).colaboradorService;
  });

  test("sin ningun dato de identificacion no se puede crear", async () => {
    await expect(colaboradorService.crear({})).rejects.toThrow(DomainError);
  });

  test("solo con nombre, sin apellido, tampoco alcanza", async () => {
    await expect(colaboradorService.crear({ nombre: "Ada" })).rejects.toThrow(DomainError);
  });

  test.each([
    ["nombreFantasia", { nombreFantasia: "ada" }],
    ["cuentaGit", { cuentaGit: "ada" }],
    ["nombre + apellido", { nombre: "Ada", apellido: "Lovelace" }],
  ])("alcanza con %s", async (_caso, datos) => {
    expect((await colaboradorService.crear(datos)).id).toBeDefined();
  });

  test("buscar un id que no existe tira NotFoundError", async () => {
    await expect(colaboradorService.buscarPorId("no-existe")).rejects.toThrow(NotFoundError);
  });
});

describe("ColaboradorService · pronombres", () => {
  let colaboradorService;
  let colaborador;

  beforeEach(async () => {
    colaboradorService = (await armarServices()).colaboradorService;
    colaborador = await colaboradorService.crear({ cuentaGit: "ada", pronombres: ["ella"] });
  });

  test("el alta deduplica los pronombres del payload", async () => {
    const otro = await colaboradorService.crear({
      cuentaGit: "grace",
      pronombres: ["ella", "ella", "elle"],
    });
    expect(otro.pronombres).toEqual(["ella", "elle"]);
  });

  test("agregar de a uno repetido tira ConflictError", async () => {
    await expect(colaboradorService.agregarPronombre(colaborador.id, "ella")).rejects.toThrow(
      ConflictError,
    );
  });

  test("agregar de a uno nuevo lo suma", async () => {
    const actualizado = await colaboradorService.agregarPronombre(colaborador.id, "elle");
    expect(actualizado.pronombres).toEqual(["ella", "elle"]);
  });

  test("quitar uno lo saca de la lista", async () => {
    const actualizado = await colaboradorService.quitarPronombre(colaborador.id, "ella");
    expect(actualizado.pronombres).toEqual([]);
  });

  test("el PUT reemplaza la lista completa y no se queja de duplicados", async () => {
    const actualizado = await colaboradorService.actualizar(colaborador.id, {
      pronombres: ["el", "el", "elle"],
    });
    expect(actualizado.pronombres).toEqual(["el", "elle"]);
  });

  test("el PUT actualiza la presentacion sin tocar los pronombres", async () => {
    const actualizado = await colaboradorService.actualizar(colaborador.id, {
      presentacion: "Hola",
    });
    expect(actualizado.presentacion).toBe("Hola");
    expect(actualizado.pronombres).toEqual(["ella"]);
  });
});

describe("ColaboradorService · habilidades", () => {
  let colaboradorService;

  beforeEach(async () => {
    colaboradorService = (await armarServices()).colaboradorService;
  });

  test("un codigo de habilidad que no existe tira NotFoundError", async () => {
    await expect(
      colaboradorService.crear({ cuentaGit: "ada", codigosHabilidades: ["inventada"] }),
    ).rejects.toThrow(NotFoundError);
  });

  test("agregar la misma habilidad dos veces es idempotente", async () => {
    const colaborador = await colaboradorService.crear({ cuentaGit: "ada" });
    await colaboradorService.agregarHabilidad(colaborador.id, CODIGOS.node);
    const final = await colaboradorService.agregarHabilidad(colaborador.id, CODIGOS.node);
    expect(final.habilidades).toHaveLength(1);
  });

  test("quitar una habilidad la saca", async () => {
    const colaborador = await colaboradorService.crear({
      cuentaGit: "ada",
      codigosHabilidades: [CODIGOS.node, CODIGOS.react],
    });
    const final = await colaboradorService.quitarHabilidad(colaborador.id, CODIGOS.node);
    expect(final.habilidades.map((h) => h.codigo)).toEqual([CODIGOS.react]);
  });
});
