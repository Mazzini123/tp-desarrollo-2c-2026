import {
  esDestacadoVigente,
  motivoDeInelegibilidad,
  ordenarVigentes,
  superaElTope,
} from "../../src/services/reglasDeDestacado.js";

const ahora = new Date("2026-11-14T12:00:00Z");
const en = (horas) => new Date(ahora.getTime() + horas * 3_600_000);
const proyecto = (extra = {}) => ({ estado: "ABIERTO", ...extra });

describe("destacados · vigencia", () => {
  test("esta vigente entre desde (inclusive) y hasta (exclusive)", () => {
    expect(
      esDestacadoVigente(proyecto({ destacado: { desde: ahora, hasta: en(1) } }), ahora),
    ).toBe(true);
    expect(
      esDestacadoVigente(proyecto({ destacado: { desde: en(-2), hasta: ahora } }), ahora),
    ).toBe(false);
  });

  test("no esta vigente si todavia no empezo o ya vencio", () => {
    expect(
      esDestacadoVigente(proyecto({ destacado: { desde: en(1), hasta: en(2) } }), ahora),
    ).toBe(false);
    expect(
      esDestacadoVigente(
        proyecto({ destacado: { desde: en(-5), hasta: en(-1) } }),
        ahora,
      ),
    ).toBe(false);
  });

  test("sin destacado no esta vigente", () => {
    expect(esDestacadoVigente(proyecto(), ahora)).toBe(false);
  });

  test("un proyecto finalizado deja de estar vigente aunque no haya vencido", () => {
    const finalizado = {
      estado: "FINALIZADO",
      destacado: { desde: en(-1), hasta: en(5) },
    };
    expect(esDestacadoVigente(finalizado, ahora)).toBe(false);
  });
});

describe("destacados · elegibilidad", () => {
  test("un proyecto abierto de un colectivo activo es elegible", () => {
    expect(motivoDeInelegibilidad(proyecto(), { fechaBaja: null })).toBeNull();
  });

  test("un proyecto finalizado no es elegible", () => {
    expect(motivoDeInelegibilidad({ estado: "FINALIZADO" }, { fechaBaja: null })).toMatch(
      /abiertos/,
    );
  });

  test("un colectivo dado de baja o inexistente no es elegible", () => {
    expect(motivoDeInelegibilidad(proyecto(), { fechaBaja: ahora })).toMatch(/baja/);
    expect(motivoDeInelegibilidad(proyecto(), null)).toMatch(/baja/);
  });
});

describe("destacados · tope y orden", () => {
  test("supera el tope cuando los vigentes ajenos ya lo alcanzaron", () => {
    expect(superaElTope(5, 6)).toBe(false);
    expect(superaElTope(6, 6)).toBe(true);
  });

  test("ordena primero al que menos tiempo lleva destacado y, ante empate, al que vence antes", () => {
    const a = { id: "a", destacado: { desde: en(-10), hasta: en(5) } };
    const b = { id: "b", destacado: { desde: en(-2), hasta: en(9) } };
    const c = { id: "c", destacado: { desde: en(-2), hasta: en(3) } };
    expect(ordenarVigentes([a, b, c]).map((p) => p.id)).toEqual(["c", "b", "a"]);
  });
});
