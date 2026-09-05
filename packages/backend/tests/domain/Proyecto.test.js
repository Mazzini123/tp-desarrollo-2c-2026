import { describe, it, expect } from "@jest/globals";
import { Proyecto } from "../../src/domain/Proyecto.js";
import { Colaborador } from "../../src/domain/Colaborador.js";
import { Colaboracion } from "../../src/domain/Colaboracion.js";
import { Habilidad } from "../../src/domain/Habilidad.js";
import { Compromiso } from "../../src/domain/Compromiso.js";
import { ModalidadColaboracion } from "../../src/domain/ModalidadColaboracion.js";
import { PERIODO_COMPROMISO } from "../../src/domain/enums/PeriodoCompromiso.js";
import { PROYECTO_ESTADO } from "../../src/domain/enums/ProyectoEstado.js";
import { DomainError, ConflictError } from "../../src/errors/index.js";

const react = () => Habilidad.crear({ titulo: "Desarrollo Web React", descripcion: "" });
const node = () => Habilidad.crear({ titulo: "Desarrollo Node", descripcion: "" });

function datosValidos(overrides = {}) {
  return {
    titulo: "Sitio institucional",
    descripcion: "Rediseño del sitio",
    compromisoEsperado: new Compromiso({
      cantidadHoras: 5,
      periodo: PERIODO_COMPROMISO.HS_SEMANALES,
    }),
    modalidadColaboracion: new ModalidadColaboracion(),
    habilidadesNecesarias: [react()],
    ...overrides,
  };
}

describe("Proyecto", () => {
  it("se crea ABIERTO y sin colaboraciones", () => {
    const proyecto = new Proyecto(datosValidos());

    expect(proyecto.estado).toBe(PROYECTO_ESTADO.ABIERTO);
    expect(proyecto.estaAbierto()).toBe(true);
    expect(proyecto.colaboraciones).toHaveLength(0);
  });

  it("rechaza crearse sin habilidades necesarias", () => {
    expect(() => new Proyecto(datosValidos({ habilidadesNecesarias: [] }))).toThrow(DomainError);
  });

  it("rechaza un compromiso que no sea instancia de Compromiso", () => {
    expect(() => new Proyecto(datosValidos({ compromisoEsperado: { cantidadHoras: 5 } }))).toThrow(
      DomainError,
    );
  });

  it("cumpleHabilidadesRequeridas es true si el colaborador tiene alguna", () => {
    const proyecto = new Proyecto(datosValidos());
    const colaborador = new Colaborador({ nombreFantasia: "ByteRunner" });
    colaborador.agregarHabilidad(react());

    expect(proyecto.cumpleHabilidadesRequeridas(colaborador)).toBe(true);
  });

  it("cumpleHabilidadesRequeridas es false si no comparte ninguna", () => {
    const proyecto = new Proyecto(datosValidos());
    const colaborador = new Colaborador({ nombreFantasia: "ByteRunner" });
    colaborador.agregarHabilidad(node());

    expect(proyecto.cumpleHabilidadesRequeridas(colaborador)).toBe(false);
  });

  it("finalizarProyecto pasa a FINALIZADO y no se puede repetir", () => {
    const proyecto = new Proyecto(datosValidos());
    proyecto.finalizarProyecto();

    expect(proyecto.estado).toBe(PROYECTO_ESTADO.FINALIZADO);
    expect(() => proyecto.finalizarProyecto()).toThrow(ConflictError);
  });

  it("quitarHabilidadRequerida rechaza dejar el proyecto sin habilidades", () => {
    const proyecto = new Proyecto(datosValidos());

    expect(() => proyecto.quitarHabilidadRequerida(react())).toThrow(DomainError);
  });

  it("quitarHabilidadRequerida funciona si quedan otras", () => {
    const proyecto = new Proyecto(datosValidos({ habilidadesNecesarias: [react(), node()] }));
    proyecto.quitarHabilidadRequerida(node());

    expect(proyecto.habilidadesNecesarias).toHaveLength(1);
  });

  it("yaColaboraron detecta un colaborador ya anotado", () => {
    const proyecto = new Proyecto(datosValidos());
    const colaborador = new Colaborador({ nombreFantasia: "ByteRunner" });
    proyecto.agregarColaboracion(new Colaboracion({ colaborador }));

    expect(proyecto.yaColaboraron(colaborador)).toBe(true);
  });
});
