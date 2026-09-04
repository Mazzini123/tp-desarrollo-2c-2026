import { describe, it, expect } from "@jest/globals";
import {
  armarServicios,
  prepararCatalogo,
  crearColectivoDeEjemplo,
  crearProyectoDeEjemplo,
  crearColaboradorDeEjemplo,
} from "./testHelpers.js";
import { DomainError } from "../../src/domain/DomainError.js";

function escenario(overridesColaborador = {}) {
  const servicios = armarServicios();
  prepararCatalogo(servicios.habilidadService);

  const colectivo = crearColectivoDeEjemplo(servicios.colectivoService);
  const proyecto = crearProyectoDeEjemplo(servicios.proyectoService, colectivo.id, {
    habilidadesNecesarias: ["desarrollo_web_react"],
  });
  const colaborador = crearColaboradorDeEjemplo(servicios.colaboradorService, overridesColaborador);

  return { ...servicios, colectivo, proyecto, colaborador };
}

describe("ColaboracionService", () => {
  it("registra la colaboración si el colaborador tiene la habilidad", () => {
    const { colaboracionService, proyecto, colaborador } = escenario({
      habilidades: ["desarrollo_web_react"],
    });

    const colaboracion = colaboracionService.registrar({
      proyectoId: proyecto.id,
      colaboradorId: colaborador.id,
    });

    expect(colaboracion.colaborador.id).toBe(colaborador.id);
    expect(colaboracionService.listarPorProyecto(proyecto.id)).toHaveLength(1);
  });

  it("rechaza si no tiene ninguna de las habilidades necesarias", () => {
    const { colaboracionService, proyecto, colaborador } = escenario({
      habilidades: ["desarrollo_node"],
    });

    expect(() =>
      colaboracionService.registrar({ proyectoId: proyecto.id, colaboradorId: colaborador.id }),
    ).toThrow(DomainError);
  });

  it("rechaza anotarse a un proyecto finalizado", () => {
    const { colaboracionService, proyectoService, proyecto, colaborador } = escenario({
      habilidades: ["desarrollo_web_react"],
    });
    proyectoService.finalizar(proyecto.id);

    expect(() =>
      colaboracionService.registrar({ proyectoId: proyecto.id, colaboradorId: colaborador.id }),
    ).toThrow(DomainError);
  });

  it("rechaza anotar dos veces al mismo colaborador", () => {
    const { colaboracionService, proyecto, colaborador } = escenario({
      habilidades: ["desarrollo_web_react"],
    });
    colaboracionService.registrar({ proyectoId: proyecto.id, colaboradorId: colaborador.id });

    expect(() =>
      colaboracionService.registrar({ proyectoId: proyecto.id, colaboradorId: colaborador.id }),
    ).toThrow(DomainError);
  });

  it("listarPorColaborador arma el historial recorriendo los proyectos", () => {
    const { colaboracionService, proyecto, colaborador } = escenario({
      habilidades: ["desarrollo_web_react"],
    });
    colaboracionService.registrar({ proyectoId: proyecto.id, colaboradorId: colaborador.id });

    const historial = colaboracionService.listarPorColaborador(colaborador.id);

    expect(historial).toHaveLength(1);
    expect(historial[0].proyectoId).toBe(proyecto.id);
  });
});
