import { describe, it, expect } from "@jest/globals";
import {
  armarServicios,
  prepararCatalogo,
  crearColectivoDeEjemplo,
  crearProyectoDeEjemplo,
} from "./testHelpers.js";
import { DomainError, ConflictError } from "../../src/errors/index.js";
import { NotFoundError } from "../../src/errors/index.js";
import { PROYECTO_ESTADO } from "../../src/domain/enums/ProyectoEstado.js";

function escenario() {
  const servicios = armarServicios();
  prepararCatalogo(servicios.habilidadService);
  const colectivo = crearColectivoDeEjemplo(servicios.colectivoService);
  return { ...servicios, colectivo };
}

describe("ProyectoService", () => {
  it("crea el proyecto dentro de su colectivo", () => {
    const { proyectoService, colectivoService, colectivo } = escenario();
    const proyecto = crearProyectoDeEjemplo(proyectoService, colectivo.id);

    expect(proyecto.estado).toBe(PROYECTO_ESTADO.ABIERTO);
    expect(colectivoService.buscarPorId(colectivo.id).proyectos).toHaveLength(1);
  });

  it("rechaza crear para un colectivo inexistente", () => {
    const { proyectoService } = escenario();

    expect(() => crearProyectoDeEjemplo(proyectoService, "no-existe")).toThrow(NotFoundError);
  });

  it("rechaza una habilidad fuera del catálogo", () => {
    const { proyectoService, colectivo } = escenario();

    expect(() =>
      crearProyectoDeEjemplo(proyectoService, colectivo.id, {
        habilidadesNecesarias: ["habilidad_inventada"],
      }),
    ).toThrow(DomainError);
  });

  it("buscarPorId encuentra el proyecto navegando desde los colectivos", () => {
    const { proyectoService, colectivo } = escenario();
    const proyecto = crearProyectoDeEjemplo(proyectoService, colectivo.id);

    expect(proyectoService.buscarPorId(proyecto.id).id).toBe(proyecto.id);
  });

  it("buscarPorId lanza NotFoundError si no existe", () => {
    const { proyectoService } = escenario();

    expect(() => proyectoService.buscarPorId("no-existe")).toThrow(NotFoundError);
  });

  it("finalizar cierra el proyecto y no se puede repetir", () => {
    const { proyectoService, colectivo } = escenario();
    const proyecto = crearProyectoDeEjemplo(proyectoService, colectivo.id);

    proyectoService.finalizar(proyecto.id);

    expect(proyectoService.buscarPorId(proyecto.id).estado).toBe(PROYECTO_ESTADO.FINALIZADO);
    expect(() => proyectoService.finalizar(proyecto.id)).toThrow(ConflictError);
  });

  it("agregarHabilidadRequerida suma una del catálogo", () => {
    const { proyectoService, colectivo } = escenario();
    const proyecto = crearProyectoDeEjemplo(proyectoService, colectivo.id);

    proyectoService.agregarHabilidadRequerida(proyecto.id, "desarrollo_node");

    expect(proyectoService.buscarPorId(proyecto.id).habilidadesNecesarias).toHaveLength(2);
  });

  it("no permite modificar un proyecto finalizado", () => {
    const { proyectoService, colectivo } = escenario();
    const proyecto = crearProyectoDeEjemplo(proyectoService, colectivo.id);
    proyectoService.finalizar(proyecto.id);

    expect(() => proyectoService.actualizar(proyecto.id, { titulo: "Otro" })).toThrow(
      ConflictError,
    );
  });

  it("no permite agregar habilidades a un proyecto finalizado", () => {
    const { proyectoService, colectivo } = escenario();
    const proyecto = crearProyectoDeEjemplo(proyectoService, colectivo.id);
    proyectoService.finalizar(proyecto.id);

    expect(() =>
      proyectoService.agregarHabilidadRequerida(proyecto.id, "desarrollo_node"),
    ).toThrow(ConflictError);
  });

  it("no permite quitar habilidades de un proyecto finalizado", () => {
    const { proyectoService, colectivo } = escenario();
    const proyecto = crearProyectoDeEjemplo(proyectoService, colectivo.id, {
      habilidadesNecesarias: ["desarrollo_web_react", "desarrollo_node"],
    });
    proyectoService.finalizar(proyecto.id);

    expect(() =>
      proyectoService.quitarHabilidadRequerida(proyecto.id, "desarrollo_node"),
    ).toThrow(ConflictError);
  });

  it("listar pagina y calcula el total de páginas", () => {
    const { proyectoService, colectivo } = escenario();
    crearProyectoDeEjemplo(proyectoService, colectivo.id, { titulo: "Uno" });
    crearProyectoDeEjemplo(proyectoService, colectivo.id, { titulo: "Dos" });
    crearProyectoDeEjemplo(proyectoService, colectivo.id, { titulo: "Tres" });

    const pagina = proyectoService.listar({ numeroPagina: 2, limitePorPagina: 2 });

    expect(pagina.items).toHaveLength(1);
    expect(pagina.total).toBe(3);
    expect(pagina.totalPaginas).toBe(2);
  });

  it("listar sin elementos devuelve cero páginas, no una vacía", () => {
    const { proyectoService } = escenario();

    const pagina = proyectoService.listar({ numeroPagina: 1, limitePorPagina: 10 });

    expect(pagina.items).toHaveLength(0);
    expect(pagina.totalPaginas).toBe(0);
  });

  it("listar devuelve los proyectos de todos los colectivos", () => {
    const { proyectoService, colectivoService, colectivo } = escenario();
    const otro = crearColectivoDeEjemplo(colectivoService, { nombre: "Otra ONG" });
    crearProyectoDeEjemplo(proyectoService, colectivo.id);
    crearProyectoDeEjemplo(proyectoService, otro.id);

    expect(proyectoService.listar().items).toHaveLength(2);
  });
});
