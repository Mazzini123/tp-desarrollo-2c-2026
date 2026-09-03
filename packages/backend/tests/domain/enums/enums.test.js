import { describe, it, expect } from "@jest/globals";
import { TipoDeColectivo, esTipoDeColectivoValido } from "../../../src/domain/enums/TipoDeColectivo.js";
import { EstadoProyecto, esEstadoProyectoValido } from "../../../src/domain/enums/EstadoProyecto.js";
import { NivelUbicacion, esNivelUbicacionValido } from "../../../src/domain/enums/NivelUbicacion.js";
import { UnidadDeCompromiso, esUnidadDeCompromisoValida } from "../../../src/domain/enums/UnidadDeCompromiso.js";

describe("TipoDeColectivo", () => {
  it("acepta los 4 valores definidos", () => {
    expect(esTipoDeColectivoValido(TipoDeColectivo.FUNDACION)).toBe(true);
    expect(esTipoDeColectivoValido(TipoDeColectivo.ASOCIACION_BARRIAL)).toBe(true);
    expect(esTipoDeColectivoValido(TipoDeColectivo.ONG)).toBe(true);
    expect(esTipoDeColectivoValido(TipoDeColectivo.ASAMBLEA)).toBe(true);
  });

  it("rechaza un valor no definido", () => {
    expect(esTipoDeColectivoValido("COOPERATIVA")).toBe(false);
  });
});

describe("EstadoProyecto", () => {
  it("acepta ABIERTO y FINALIZADO", () => {
    expect(esEstadoProyectoValido(EstadoProyecto.ABIERTO)).toBe(true);
    expect(esEstadoProyectoValido(EstadoProyecto.FINALIZADO)).toBe(true);
  });

  it("rechaza un valor no definido", () => {
    expect(esEstadoProyectoValido("PAUSADO")).toBe(false);
  });
});

describe("NivelUbicacion", () => {
  it("acepta los 4 niveles definidos", () => {
    expect(esNivelUbicacionValido(NivelUbicacion.ARGENTINA)).toBe(true);
    expect(esNivelUbicacionValido(NivelUbicacion.PROVINCIA)).toBe(true);
    expect(esNivelUbicacionValido(NivelUbicacion.CABA)).toBe(true);
    expect(esNivelUbicacionValido(NivelUbicacion.LOCALIDAD)).toBe(true);
  });
});

describe("UnidadDeCompromiso", () => {
  it("acepta las 3 unidades definidas", () => {
    expect(esUnidadDeCompromisoValida(UnidadDeCompromiso.HORAS_TOTALES)).toBe(true);
    expect(esUnidadDeCompromisoValida(UnidadDeCompromiso.HORAS_SEMANALES)).toBe(true);
    expect(esUnidadDeCompromisoValida(UnidadDeCompromiso.HORAS_MENSUALES)).toBe(true);
  });
});
