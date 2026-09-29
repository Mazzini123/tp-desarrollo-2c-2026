import {
  armarServices,
  crearColectivoDePrueba,
  crearProyectoDePrueba,
  datosDePerfil,
} from "../fixtures.js";
import { DomainError } from "../../src/errors/DomainError.js";
import { ConflictError } from "../../src/errors/ConflictError.js";
import { NotFoundError } from "../../src/errors/NotFoundError.js";

describe("ProyectoService · alta", () => {
  let services;

  beforeEach(async () => {
    services = await armarServices();
  });

  test("un proyecto sin ningun perfil no se puede crear", async () => {
    const colectivo = await crearColectivoDePrueba(services.colectivoService);
    await expect(
      services.proyectoService.crear({
        colectivoId: colectivo.id,
        titulo: "Sin perfiles",
        descripcion: "...",
        perfiles: [],
      }),
    ).rejects.toThrow(DomainError);
  });

  // "Un proyecto sin colectivo no existe" — se definio en el coloquio que la
  // responsabilidad de crearlo queda en el service de Colectivo.
  test("un colectivo que no existe tira NotFoundError", async () => {
    await expect(
      services.proyectoService.crear({
        colectivoId: "no-existe",
        titulo: "Huerfano",
        descripcion: "...",
        perfiles: [datosDePerfil()],
      }),
    ).rejects.toThrow(NotFoundError);
  });

  test("el proyecto queda guardado dentro de su colectivo", async () => {
    const { colectivo, proyecto } = await crearProyectoDePrueba(services);
    const guardado = await services.colectivoService.buscarPorId(colectivo.id);
    expect(guardado.proyectos).toContain(proyecto);
  });

  test("un compromiso de horas no entero es rechazado", async () => {
    const colectivo = await crearColectivoDePrueba(services.colectivoService);
    await expect(
      services.proyectoService.crear({
        colectivoId: colectivo.id,
        titulo: "Medio compromiso",
        descripcion: "...",
        perfiles: [{ ...datosDePerfil(), compromiso: { cantidadHoras: 2.5, periodo: "HS_MENSUALES" } }],
      }),
    ).rejects.toThrow(DomainError);
  });
});

describe("ProyectoService · proyecto finalizado", () => {
  let services;
  let proyecto;

  beforeEach(async () => {
    services = await armarServices();
    proyecto = (await crearProyectoDePrueba(services)).proyecto;
    await services.proyectoService.finalizar(proyecto.id);
  });

  test.each([
    ["actualizar", (s, id) => s.proyectoService.actualizar(id, { titulo: "Otro" })],
    ["volver a finalizar", (s, id) => s.proyectoService.finalizar(id)],
    ["agregarle un perfil", (s, id) => s.perfilService.crear(id, datosDePerfil())],
  ])("no se puede %s", async (_caso, operacion) => {
    await expect(operacion(services, proyecto.id)).rejects.toThrow(ConflictError);
  });
});

// La paginacion atraviesa las tres capas: el controller la valida y traduce,
// el service calcula totalPaginas, el repositorio corta con offset.
describe("ProyectoService · paginacion", () => {
  let services;

  beforeEach(async () => {
    services = await armarServices();
    const colectivo = await crearColectivoDePrueba(services.colectivoService);
    for (let i = 1; i <= 12; i++) {
      await services.proyectoService.crear({
        colectivoId: colectivo.id,
        titulo: `Proyecto ${i}`,
        descripcion: "...",
        perfiles: [datosDePerfil()],
      });
    }
  });

  test("page=2 limit=5 sobre 12 items devuelve 5 y total_pages 3", async () => {
    const pagina = await services.proyectoService.listar({ numeroPagina: 2, limitePorPagina: 5 });
    expect(pagina.items).toHaveLength(5);
    expect(pagina.total).toBe(12);
    expect(pagina.totalPaginas).toBe(3);
    expect(pagina.items[0].titulo).toBe("Proyecto 6");
  });

  test("la ultima pagina puede venir incompleta", async () => {
    const pagina = await services.proyectoService.listar({ numeroPagina: 3, limitePorPagina: 5 });
    expect(pagina.items).toHaveLength(2);
  });

  // Lo que el profesor dejo pendiente en la clase de capas: pedir una pagina
  // que no existe hoy responde 200 con una lista vacia.
  test("una pagina que no existe devuelve una lista vacia, no un error", async () => {
    const pagina = await services.proyectoService.listar({ numeroPagina: 99, limitePorPagina: 5 });
    expect(pagina.items).toEqual([]);
    expect(pagina.totalPaginas).toBe(3);
  });
});
