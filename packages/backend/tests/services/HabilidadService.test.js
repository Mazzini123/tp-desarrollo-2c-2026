import { armarServices, CODIGOS } from "../fixtures.js";
import { DomainError } from "../../src/errors/DomainError.js";
import { ConflictError } from "../../src/errors/ConflictError.js";
import { NotFoundError } from "../../src/errors/NotFoundError.js";

describe("HabilidadService", () => {
  let habilidadService;

  beforeEach(async () => {
    habilidadService = (await armarServices()).habilidadService;
  });

  test("el seed deja el catalogo con las 5 habilidades iniciales", async () => {
    expect(await habilidadService.listarTodas()).toHaveLength(5);
  });

  test("el codigo se deriva del titulo normalizado a snake_case", async () => {
    const habilidad = await habilidadService.crear({ titulo: "Uso de SOAP UI" });
    expect(habilidad.codigo).toBe("uso_de_soap_ui");
  });

  test("un titulo que normaliza al mismo codigo tira ConflictError", async () => {
    await expect(habilidadService.crear({ titulo: "desarrollo node" })).rejects.toThrow(
      ConflictError,
    );
  });

  test("un titulo vacio es rechazado", async () => {
    await expect(habilidadService.crear({ titulo: "   " })).rejects.toThrow(DomainError);
  });

  test("resolver un codigo inexistente tira NotFoundError", async () => {
    await expect(habilidadService.resolverPorCodigos(["inventada"])).rejects.toThrow(
      NotFoundError,
    );
  });

  test("resolver una lista vacia es un error de dominio", async () => {
    await expect(habilidadService.resolverPorCodigos([])).rejects.toThrow(DomainError);
  });

  // Con el repo en memoria, desactivar el objeto devuelto alcanza para darla
  // de baja: el repo guarda esa misma referencia.
  test("una habilidad dada de baja no se puede usar", async () => {
    const [node] = await habilidadService.resolverPorCodigos([CODIGOS.node]);
    node.desactivar();
    await expect(habilidadService.resolverPorCodigos([CODIGOS.node])).rejects.toThrow(
      DomainError,
    );
  });
});
