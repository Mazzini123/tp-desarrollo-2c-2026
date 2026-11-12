import { armarServices, crearColectivoDePrueba } from "../fixtures.js";
import { DomainError } from "../../src/errors/DomainError.js";
import { NotFoundError } from "../../src/errors/NotFoundError.js";

describe("ColectivoService · alta", () => {
  let colectivoService;

  beforeEach(async () => {
    colectivoService = (await armarServices()).colectivoService;
  });

  test("crea un colectivo sin ubicacion", async () => {
    const colectivo = await crearColectivoDePrueba(colectivoService);
    expect(colectivo.id).toBeDefined();
    expect(colectivo.ubicacion).toBeNull();
  });

  test("buscar un id que no existe tira NotFoundError", async () => {
    await expect(colectivoService.buscarPorId("no-existe")).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe("ColectivoService · ubicacion", () => {
  let colectivoService;

  beforeEach(async () => {
    colectivoService = (await armarServices()).colectivoService;
  });

  function crearCon(ubicacion) {
    return colectivoService.crear({
      nombre: "Fundacion Ejemplo",
      descripcion: "Colectivo de prueba",
      tipoColectivo: "FUNDACION",
      ubicacion,
    });
  }

  test("PROVINCIA exige una de las 23 provincias argentinas", async () => {
    await expect(
      crearCon({ tipoUbicacion: "PROVINCIA", nombre: "Montevideo" }),
    ).rejects.toThrow(DomainError);
    expect(
      (await crearCon({ tipoUbicacion: "PROVINCIA", nombre: "Santa Fe" })).ubicacion,
    ).toBeDefined();
  });

  test("LOCALIDAD exige nombre", async () => {
    await expect(crearCon({ tipoUbicacion: "LOCALIDAD" })).rejects.toThrow(DomainError);
  });
});

describe("ColectivoService · actualizacion", () => {
  test("actualiza solo los campos presentes", async () => {
    const { colectivoService } = await armarServices();
    const colectivo = await crearColectivoDePrueba(colectivoService);

    const actualizado = await colectivoService.actualizar(colectivo.id, {
      nombre: "Nuevo nombre",
    });

    expect(actualizado.nombre).toBe("Nuevo nombre");
    expect(actualizado.descripcion).toBe("Colectivo de prueba");
  });
});
