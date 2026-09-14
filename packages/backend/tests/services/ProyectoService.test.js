import {
  armarServices,
  crearColectivoDePrueba,
  crearProyectoDePrueba,
  CODIGOS,
} from "../fixtures.js";
import { DomainError } from "../../src/errors/DomainError.js";
import { ConflictError } from "../../src/errors/ConflictError.js";
import { NotFoundError } from "../../src/errors/NotFoundError.js";

describe("ProyectoService · alta", () => {
  let services;

  beforeEach(() => {
    services = armarServices();
  });

  test("un proyecto sin ninguna habilidad necesaria no se puede crear", () => {
    const colectivo = crearColectivoDePrueba(services.colectivoService);
    expect(() =>
      services.proyectoService.crear({
        colectivoId: colectivo.id,
        titulo: "Sin habilidades",
        descripcion: "...",
        compromisoEsperado: { cantidadHoras: 5, periodo: "HS_MENSUALES" },
        habilidadesNecesarias: [],
      }),
    ).toThrow(DomainError);
  });

  // "Un proyecto sin colectivo no existe" — se definio en el coloquio que la
  // responsabilidad de crearlo queda en el service de Colectivo.
  test("un colectivo que no existe tira NotFoundError", () => {
    expect(() =>
      services.proyectoService.crear({
        colectivoId: "no-existe",
        titulo: "Huerfano",
        descripcion: "...",
        compromisoEsperado: { cantidadHoras: 5, periodo: "HS_MENSUALES" },
        habilidadesNecesarias: [CODIGOS.node],
      }),
    ).toThrow(NotFoundError);
  });

  test("el proyecto queda guardado dentro de su colectivo", () => {
    const { colectivo, proyecto } = crearProyectoDePrueba(services);
    expect(services.colectivoService.buscarPorId(colectivo.id).proyectos).toContain(proyecto);
  });

  test("un compromiso de horas no entero es rechazado", () => {
    const colectivo = crearColectivoDePrueba(services.colectivoService);
    expect(() =>
      services.proyectoService.crear({
        colectivoId: colectivo.id,
        titulo: "Medio compromiso",
        descripcion: "...",
        compromisoEsperado: { cantidadHoras: 2.5, periodo: "HS_MENSUALES" },
        habilidadesNecesarias: [CODIGOS.node],
      }),
    ).toThrow(DomainError);
  });
});

describe("ProyectoService · proyecto finalizado", () => {
  let services;
  let proyecto;

  beforeEach(() => {
    services = armarServices();
    proyecto = crearProyectoDePrueba(services).proyecto;
    services.proyectoService.finalizar(proyecto.id);
  });

  test.each([
    ["actualizar", (s, id) => s.proyectoService.actualizar(id, { titulo: "Otro" })],
    ["agregar habilidad", (s, id) => s.proyectoService.agregarHabilidadRequerida(id, CODIGOS.react)],
    ["quitar habilidad", (s, id) => s.proyectoService.quitarHabilidadRequerida(id, CODIGOS.node)],
    ["volver a finalizar", (s, id) => s.proyectoService.finalizar(id)],
  ])("no se puede %s", (_caso, operacion) => {
    expect(() => operacion(services, proyecto.id)).toThrow(ConflictError);
  });
});

describe("ProyectoService · habilidades requeridas", () => {
  test("no se puede quitar la ultima habilidad necesaria", () => {
    const services = armarServices();
    const { proyecto } = crearProyectoDePrueba(services, { habilidades: [CODIGOS.node] });

    expect(() =>
      services.proyectoService.quitarHabilidadRequerida(proyecto.id, CODIGOS.node),
    ).toThrow(DomainError);
  });

  test("se puede quitar una si quedan dos", () => {
    const services = armarServices();
    const { proyecto } = crearProyectoDePrueba(services, {
      habilidades: [CODIGOS.node, CODIGOS.react],
    });

    const final = services.proyectoService.quitarHabilidadRequerida(proyecto.id, CODIGOS.node);
    expect(final.habilidadesNecesarias).toHaveLength(1);
  });
});

// La paginacion atraviesa las tres capas: el controller la valida y traduce,
// el service calcula totalPaginas, el repositorio corta con offset.
describe("ProyectoService · paginacion", () => {
  let services;

  beforeEach(() => {
    services = armarServices();
    const colectivo = crearColectivoDePrueba(services.colectivoService);
    for (let i = 1; i <= 12; i++) {
      services.proyectoService.crear({
        colectivoId: colectivo.id,
        titulo: `Proyecto ${i}`,
        descripcion: "...",
        compromisoEsperado: { cantidadHoras: 5, periodo: "HS_MENSUALES" },
        habilidadesNecesarias: [CODIGOS.node],
      });
    }
  });

  test("page=2 limit=5 sobre 12 items devuelve 5 y total_pages 3", () => {
    const pagina = services.proyectoService.listar({ numeroPagina: 2, limitePorPagina: 5 });
    expect(pagina.items).toHaveLength(5);
    expect(pagina.total).toBe(12);
    expect(pagina.totalPaginas).toBe(3);
    expect(pagina.items[0].titulo).toBe("Proyecto 6");
  });

  test("la ultima pagina puede venir incompleta", () => {
    const pagina = services.proyectoService.listar({ numeroPagina: 3, limitePorPagina: 5 });
    expect(pagina.items).toHaveLength(2);
  });

  // Lo que el profesor dejo pendiente en la clase de capas: pedir una pagina
  // que no existe hoy responde 200 con una lista vacia.
  test("una pagina que no existe devuelve una lista vacia, no un error", () => {
    const pagina = services.proyectoService.listar({ numeroPagina: 99, limitePorPagina: 5 });
    expect(pagina.items).toEqual([]);
    expect(pagina.totalPaginas).toBe(3);
  });
});
