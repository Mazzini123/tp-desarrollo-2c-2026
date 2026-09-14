import { armarServices, CODIGOS } from "../fixtures.js";
import { DomainError } from "../../src/errors/DomainError.js";
import { ConflictError } from "../../src/errors/ConflictError.js";
import { NotFoundError } from "../../src/errors/NotFoundError.js";

describe("HabilidadService", () => {
  let habilidadService;

  beforeEach(() => {
    habilidadService = armarServices().habilidadService;
  });

  test("el seed deja el catalogo con las 5 habilidades iniciales", () => {
    expect(habilidadService.listarTodas()).toHaveLength(5);
  });

  test("el codigo se deriva del titulo normalizado a snake_case", () => {
    const habilidad = habilidadService.crear({ titulo: "Uso de SOAP UI" });
    expect(habilidad.codigo).toBe("uso_de_soap_ui");
  });

  test("un titulo que normaliza al mismo codigo tira ConflictError", () => {
    expect(() => habilidadService.crear({ titulo: "desarrollo node" })).toThrow(ConflictError);
  });

  test("un titulo vacio es rechazado", () => {
    expect(() => habilidadService.crear({ titulo: "   " })).toThrow(DomainError);
  });

  test("resolver un codigo inexistente tira NotFoundError", () => {
    expect(() => habilidadService.resolverPorCodigos(["inventada"])).toThrow(NotFoundError);
  });

  test("resolver una lista vacia es un error de dominio", () => {
    expect(() => habilidadService.resolverPorCodigos([])).toThrow(DomainError);
  });

  test("una habilidad dada de baja no se puede usar", () => {
    const [node] = habilidadService.resolverPorCodigos([CODIGOS.node]);
    node.desactivar();
    expect(() => habilidadService.resolverPorCodigos([CODIGOS.node])).toThrow(DomainError);
  });
});
