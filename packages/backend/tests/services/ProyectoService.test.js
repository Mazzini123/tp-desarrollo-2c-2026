import { describe, it, expect } from "@jest/globals";
import {
  armarServicios,
  crearColectivoDeEjemplo,
  crearProyectoDeEjemplo,
} from "./testHelpers.js";
import { DomainError } from "../../src/domain/DomainError.js";
import { NotFoundError } from "../../src/errors/NotFoundError.js";
import { EstadoProyecto } from "../../src/domain/enums/EstadoProyecto.js";

function prepararCatalogo(habilidadService) {
  habilidadService.crear({ titulo: "Desarrollo Web React", descripcion: "" });
  habilidadService.crear({ titulo: "Desarrollo Node", descripcion: "" });
}

describe("ProyectoService", () => {
  it("crea un proyecto asociado a un colectivo existente", () => {
    const { habilidadService, colectivoService, proyectoService } = armarServicios();
    prepararCatalogo(habilidadService);
    const colectivo = crearColectivoDeEjemplo(colectivoService);

    const proyecto = crearProyectoDeEjemplo(proyectoService, colectivo.id);

    expect(proyecto.colectivoId).toBe(colectivo.id);
    expect(proyecto.estado).toBe(EstadoProyecto.ABIERTO);
    expect(proyecto.habilidadesRequeridas).toHaveLength(1);
  });

  it("rechaza crear un proyecto para un colectivo que no existe", () => {
    const { habilidadService, proyectoService } = armarServicios();
    prepararCatalogo(habilidadService);

    expect(() => crearProyectoDeEjemplo(proyectoService, "no-existe")).toThrow(NotFoundError);
  });

  it("rechaza crear un proyecto con una habilidad que no está en el catálogo", () => {
    const { colectivoService, proyectoService } = armarServicios();
    const colectivo = crearColectivoDeEjemplo(colectivoService);

    expect(() =>
      crearProyectoDeEjemplo(proyectoService, colectivo.id, {
        habilidadesRequeridas: ["habilidad_inexistente"],
      }),
    ).toThrow(DomainError);
  });

  it("finalizar pasa el proyecto a FINALIZADO", () => {
    const { habilidadService, colectivoService, proyectoService } = armarServicios();
    prepararCatalogo(habilidadService);
    const colectivo = crearColectivoDeEjemplo(colectivoService);
    const proyecto = crearProyectoDeEjemplo(proyectoService, colectivo.id);

    const finalizado = proyectoService.finalizar(proyecto.id);

    expect(finalizado.estado).toBe(EstadoProyecto.FINALIZADO);
  });

  it("finalizar dos veces rechaza (no se puede reabrir)", () => {
    const { habilidadService, colectivoService, proyectoService } = armarServicios();
    prepararCatalogo(habilidadService);
    const colectivo = crearColectivoDeEjemplo(colectivoService);
    const proyecto = crearProyectoDeEjemplo(proyectoService, colectivo.id);
    proyectoService.finalizar(proyecto.id);

    expect(() => proyectoService.finalizar(proyecto.id)).toThrow(DomainError);
  });

  it("agregarHabilidadRequerida suma una habilidad del catálogo", () => {
    const { habilidadService, colectivoService, proyectoService } = armarServicios();
    prepararCatalogo(habilidadService);
    const colectivo = crearColectivoDeEjemplo(colectivoService);
    const proyecto = crearProyectoDeEjemplo(proyectoService, colectivo.id);

    const actualizado = proyectoService.agregarHabilidadRequerida(
      proyecto.id,
      "desarrollo_node",
    );

    expect(actualizado.habilidadesRequeridas).toHaveLength(2);
  });
});
