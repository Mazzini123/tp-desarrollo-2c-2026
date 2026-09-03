import { describe, it, expect } from "@jest/globals";
import { Proyecto } from "../../src/domain/Proyecto.js";
import { Habilidad } from "../../src/domain/Habilidad.js";
import { CompromisoEsperado } from "../../src/domain/valueObjects/CompromisoEsperado.js";
import { ModalidadColaboracion } from "../../src/domain/valueObjects/ModalidadColaboracion.js";
import { UnidadDeCompromiso } from "../../src/domain/enums/UnidadDeCompromiso.js";
import { EstadoProyecto } from "../../src/domain/enums/EstadoProyecto.js";
import { DomainError } from "../../src/domain/DomainError.js";

function habilidadReact() {
  return Habilidad.crear({ titulo: "Desarrollo Web React", descripcion: "" });
}

function habilidadNode() {
  return Habilidad.crear({ titulo: "Desarrollo Node", descripcion: "" });
}

function datosValidos(overrides = {}) {
  return {
    titulo: "Sitio institucional",
    descripcion: "Rediseño del sitio de la fundación",
    colectivoId: "colectivo-1",
    compromisoEsperado: new CompromisoEsperado({
      unidad: UnidadDeCompromiso.HORAS_SEMANALES,
      cantidadHoras: 5,
    }),
    modalidadColaboracion: new ModalidadColaboracion(),
    habilidadesRequeridas: [habilidadReact()],
    ...overrides,
  };
}

describe("Proyecto", () => {
  it("se crea ABIERTO por defecto", () => {
    const proyecto = new Proyecto(datosValidos());

    expect(proyecto.estado).toBe(EstadoProyecto.ABIERTO);
    expect(proyecto.estaAbierto()).toBe(true);
    expect(proyecto.colectivoId).toBe("colectivo-1");
  });

  it("rechaza crearse sin colectivoId", () => {
    expect(() => new Proyecto(datosValidos({ colectivoId: undefined }))).toThrow(DomainError);
  });

  it("rechaza crearse sin ninguna habilidad requerida", () => {
    expect(() => new Proyecto(datosValidos({ habilidadesRequeridas: [] }))).toThrow(DomainError);
  });

  it("rechaza compromisoEsperado que no sea el value object esperado", () => {
    expect(() => new Proyecto(datosValidos({ compromisoEsperado: { cantidadHoras: 5 } }))).toThrow(
      DomainError,
    );
  });

  it("agregarHabilidadRequerida agrega una nueva y es idempotente", () => {
    const proyecto = new Proyecto(datosValidos());
    const node = habilidadNode();

    proyecto.agregarHabilidadRequerida(node);
    proyecto.agregarHabilidadRequerida(node);

    expect(proyecto.habilidadesRequeridas).toHaveLength(2);
  });

  it("quitarHabilidadRequerida saca una habilidad si quedan otras", () => {
    const proyecto = new Proyecto(
      datosValidos({ habilidadesRequeridas: [habilidadReact(), habilidadNode()] }),
    );

    proyecto.quitarHabilidadRequerida(habilidadNode());

    expect(proyecto.habilidadesRequeridas).toHaveLength(1);
    expect(proyecto.requiereHabilidad(habilidadReact())).toBe(true);
  });

  it("quitarHabilidadRequerida rechaza dejar el proyecto sin habilidades", () => {
    const proyecto = new Proyecto(datosValidos());

    expect(() => proyecto.quitarHabilidadRequerida(habilidadReact())).toThrow(DomainError);
  });

  it("finalizar pasa el proyecto a FINALIZADO", () => {
    const proyecto = new Proyecto(datosValidos());

    proyecto.finalizar();

    expect(proyecto.estado).toBe(EstadoProyecto.FINALIZADO);
    expect(proyecto.estaAbierto()).toBe(false);
  });

  it("finalizar rechaza finalizar dos veces (no se puede reabrir)", () => {
    const proyecto = new Proyecto(datosValidos());
    proyecto.finalizar();

    expect(() => proyecto.finalizar()).toThrow(DomainError);
  });
});
