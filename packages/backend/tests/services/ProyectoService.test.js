import { describe, it, expect } from "@jest/globals";
import {
  armarServicios,
  prepararCatalogo,
  crearColectivoDeEjemplo,
  crearProyectoDeEjemplo,
} from "./testHelpers.js";
import { DomainError } from "../../src/domain/DomainError.js";
import { NotFoundError } from "../../src/errors/NotFoundError.js";
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
    expect(() => proyectoService.finalizar(proyecto.id)).toThrow(DomainError);
  });

  it("agregarHabilidadRequerida suma una del catálogo", () => {
    const { proyectoService, colectivo } = escenario();
    const proyecto = crearProyectoDeEjemplo(proyectoService, colectivo.id);

    proyectoService.agregarHabilidadRequerida(proyecto.id, "desarrollo_node");

    expect(proyectoService.buscarPorId(proyecto.id).habilidadesNecesarias).toHaveLength(2);
  });

  it("listar devuelve los proyectos de todos los colectivos", () => {
    const { proyectoService, colectivoService, colectivo } = escenario();
    const otro = crearColectivoDeEjemplo(colectivoService, { nombre: "Otra ONG" });
    crearProyectoDeEjemplo(proyectoService, colectivo.id);
    crearProyectoDeEjemplo(proyectoService, otro.id);

    expect(proyectoService.listar()).toHaveLength(2);
  });
});
