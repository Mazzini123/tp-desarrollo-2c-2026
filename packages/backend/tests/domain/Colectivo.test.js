import { describe, it, expect } from "@jest/globals";
import { Colectivo } from "../../src/domain/Colectivo.js";
import { Proyecto } from "../../src/domain/Proyecto.js";
import { Ubicacion } from "../../src/domain/Ubicacion.js";
import { Habilidad } from "../../src/domain/Habilidad.js";
import { Compromiso } from "../../src/domain/Compromiso.js";
import { ModalidadColaboracion } from "../../src/domain/ModalidadColaboracion.js";
import { TIPO_COLECTIVO } from "../../src/domain/enums/TipoColectivo.js";
import { TIPO_UBICACION } from "../../src/domain/enums/TipoUbicacion.js";
import { PERIODO_COMPROMISO } from "../../src/domain/enums/PeriodoCompromiso.js";
import { DomainError } from "../../src/errors/index.js";

function datosValidos(overrides = {}) {
  return {
    nombre: "Fundación Ejemplo",
    descripcion: "Trabajamos por una causa",
    tipoColectivo: TIPO_COLECTIVO.FUNDACION,
    ...overrides,
  };
}

function unProyecto() {
  return new Proyecto({
    titulo: "Sitio",
    descripcion: "Rediseño",
    compromisoEsperado: new Compromiso({
      cantidadHoras: 5,
      periodo: PERIODO_COMPROMISO.HS_SEMANALES,
    }),
    modalidadColaboracion: new ModalidadColaboracion(),
    habilidadesNecesarias: [Habilidad.crear({ titulo: "Desarrollo Web React" })],
  });
}

describe("Colectivo", () => {
  it("se crea sin proyectos", () => {
    const colectivo = new Colectivo(datosValidos());

    expect(colectivo.proyectos).toHaveLength(0);
    expect(colectivo.id).toBeDefined();
  });

  it("rechaza tipo inválido", () => {
    expect(() => new Colectivo(datosValidos({ tipoColectivo: "COOPERATIVA" }))).toThrow(
      DomainError,
    );
  });

  it("acepta ubicación", () => {
    const ubicacion = new Ubicacion({ tipoUbicacion: TIPO_UBICACION.CABA });
    const colectivo = new Colectivo(datosValidos({ ubicacion }));

    expect(colectivo.ubicacion).toBe(ubicacion);
  });

  it("agregarProyecto lo suma a la lista", () => {
    const colectivo = new Colectivo(datosValidos());
    const proyecto = unProyecto();
    colectivo.agregarProyecto(proyecto);

    expect(colectivo.proyectos).toHaveLength(1);
  });

  it("buscarProyecto lo encuentra por id", () => {
    const colectivo = new Colectivo(datosValidos());
    const proyecto = unProyecto();
    colectivo.agregarProyecto(proyecto);

    expect(colectivo.buscarProyecto(proyecto.id)).toBe(proyecto);
    expect(colectivo.buscarProyecto("no-existe")).toBeNull();
  });

  it("actualizarDatos no toca el tipo", () => {
    const colectivo = new Colectivo(datosValidos());
    colectivo.actualizarDatos({ nombre: "Otro nombre" });

    expect(colectivo.nombre).toBe("Otro nombre");
    expect(colectivo.tipoColectivo).toBe(TIPO_COLECTIVO.FUNDACION);
  });
});
