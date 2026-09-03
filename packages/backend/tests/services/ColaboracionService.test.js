import { describe, it, expect } from "@jest/globals";
import {
  armarServicios,
  crearColectivoDeEjemplo,
  crearProyectoDeEjemplo,
  crearPersonaDeEjemplo,
} from "./testHelpers.js";
import { DomainError } from "../../src/domain/DomainError.js";

function prepararEscenario(overridesPersona = {}) {
  const servicios = armarServicios();
  const { habilidadService, colectivoService, proyectoService, personaColaboradoraService } =
    servicios;

  habilidadService.crear({ titulo: "Desarrollo Web React", descripcion: "" });
  habilidadService.crear({ titulo: "Desarrollo Node", descripcion: "" });

  const colectivo = crearColectivoDeEjemplo(colectivoService);
  const proyecto = crearProyectoDeEjemplo(proyectoService, colectivo.id, {
    habilidadesRequeridas: ["desarrollo_web_react"],
  });
  const persona = crearPersonaDeEjemplo(personaColaboradoraService, overridesPersona);

  return { ...servicios, colectivo, proyecto, persona };
}

describe("ColaboracionService", () => {
  it("registra la colaboración si la persona tiene la habilidad requerida", () => {
    const { colaboracionService, personaColaboradoraService, proyecto, persona } =
      prepararEscenario();
    personaColaboradoraService.agregarHabilidad(persona.id, "desarrollo_web_react");

    const colaboracion = colaboracionService.registrar({
      proyectoId: proyecto.id,
      personaColaboradoraId: persona.id,
    });

    expect(colaboracion.proyectoId).toBe(proyecto.id);
    expect(colaboracion.personaColaboradoraId).toBe(persona.id);
  });

  it("rechaza si la persona no tiene ninguna habilidad requerida", () => {
    const { colaboracionService, personaColaboradoraService, proyecto, persona } =
      prepararEscenario();
    // le doy una habilidad que el proyecto no requiere
    personaColaboradoraService.agregarHabilidad(persona.id, "desarrollo_node");

    expect(() =>
      colaboracionService.registrar({
        proyectoId: proyecto.id,
        personaColaboradoraId: persona.id,
      }),
    ).toThrow(DomainError);
  });

  it("rechaza anotarse a un proyecto finalizado", () => {
    const { colaboracionService, personaColaboradoraService, proyectoService, proyecto, persona } =
      prepararEscenario();
    personaColaboradoraService.agregarHabilidad(persona.id, "desarrollo_web_react");
    proyectoService.finalizar(proyecto.id);

    expect(() =>
      colaboracionService.registrar({
        proyectoId: proyecto.id,
        personaColaboradoraId: persona.id,
      }),
    ).toThrow(DomainError);
  });

  it("rechaza anotar dos veces a la misma persona en el mismo proyecto", () => {
    const { colaboracionService, personaColaboradoraService, proyecto, persona } =
      prepararEscenario();
    personaColaboradoraService.agregarHabilidad(persona.id, "desarrollo_web_react");
    colaboracionService.registrar({ proyectoId: proyecto.id, personaColaboradoraId: persona.id });

    expect(() =>
      colaboracionService.registrar({
        proyectoId: proyecto.id,
        personaColaboradoraId: persona.id,
      }),
    ).toThrow(DomainError);
  });

  it("listarPorProyecto devuelve las colaboraciones de ese proyecto", () => {
    const { colaboracionService, personaColaboradoraService, proyecto, persona } =
      prepararEscenario();
    personaColaboradoraService.agregarHabilidad(persona.id, "desarrollo_web_react");
    colaboracionService.registrar({ proyectoId: proyecto.id, personaColaboradoraId: persona.id });

    expect(colaboracionService.listarPorProyecto(proyecto.id)).toHaveLength(1);
  });
});
