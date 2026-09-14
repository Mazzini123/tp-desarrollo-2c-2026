import { armarServices, crearColectivoDePrueba } from "../fixtures.js";
import { DomainError } from "../../src/errors/DomainError.js";
import { NotFoundError } from "../../src/errors/NotFoundError.js";

describe("ColectivoService · alta", () => {
  let colectivoService;

  beforeEach(() => {
    colectivoService = armarServices().colectivoService;
  });

  test("crea un colectivo sin ubicacion", () => {
    const colectivo = crearColectivoDePrueba(colectivoService);
    expect(colectivo.id).toBeDefined();
    expect(colectivo.ubicacion).toBeNull();
    expect(colectivo.proyectos).toEqual([]);
  });

  test.each([
    ["nombre vacio", { nombre: "  ", descripcion: "ok", tipoColectivo: "FUNDACION" }],
    ["descripcion vacia", { nombre: "ok", descripcion: "", tipoColectivo: "FUNDACION" }],
    ["tipo invalido", { nombre: "ok", descripcion: "ok", tipoColectivo: "INVENTADO" }],
  ])("rechaza %s", (_caso, datos) => {
    expect(() => colectivoService.crear(datos)).toThrow(DomainError);
  });

  test("buscar un id que no existe tira NotFoundError", () => {
    expect(() => colectivoService.buscarPorId("no-existe")).toThrow(NotFoundError);
  });
});

describe("ColectivoService · ubicacion", () => {
  let colectivoService;

  beforeEach(() => {
    colectivoService = armarServices().colectivoService;
  });

  function crearCon(ubicacion) {
    return colectivoService.crear({
      nombre: "Fundacion Ejemplo",
      descripcion: "Colectivo de prueba",
      tipoColectivo: "FUNDACION",
      ubicacion,
    });
  }

  test("PROVINCIA exige una de las 23 provincias argentinas", () => {
    expect(() => crearCon({ tipoUbicacion: "PROVINCIA", nombre: "Montevideo" })).toThrow(
      DomainError,
    );
    expect(crearCon({ tipoUbicacion: "PROVINCIA", nombre: "Santa Fe" }).ubicacion).toBeDefined();
  });

  test("LOCALIDAD exige nombre", () => {
    expect(() => crearCon({ tipoUbicacion: "LOCALIDAD" })).toThrow(DomainError);
  });

  test("un tipo de ubicacion invalido es rechazado", () => {
    expect(() => crearCon({ tipoUbicacion: "BARRIO", nombre: "Avellaneda" })).toThrow(
      DomainError,
    );
  });
});

describe("ColectivoService · actualizacion", () => {
  test("actualiza solo los campos presentes", () => {
    const { colectivoService } = armarServices();
    const colectivo = crearColectivoDePrueba(colectivoService);

    const actualizado = colectivoService.actualizar(colectivo.id, { nombre: "Nuevo nombre" });

    expect(actualizado.nombre).toBe("Nuevo nombre");
    expect(actualizado.descripcion).toBe("Colectivo de prueba");
  });

  test("un nombre vacio en la actualizacion tambien se rechaza", () => {
    const { colectivoService } = armarServices();
    const colectivo = crearColectivoDePrueba(colectivoService);

    expect(() => colectivoService.actualizar(colectivo.id, { nombre: "" })).toThrow(DomainError);
  });
});
