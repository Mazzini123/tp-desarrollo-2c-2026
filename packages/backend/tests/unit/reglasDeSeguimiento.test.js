import {
  debeMarcarse,
  estaIniciado,
  fechaDeReferencia,
  ultimaActualizacion,
} from "../../src/services/reglasDeSeguimiento.js";

const DIA = 86_400_000;
const hoy = new Date("2026-11-14T12:00:00Z");
const haceDias = (dias) => new Date(hoy.getTime() - dias * DIA);
const abierto = (extra = {}) => ({
  estado: "ABIERTO",
  avances: [],
  logros: [],
  ...extra,
});

describe("seguimiento · proyecto iniciado", () => {
  test("es un proyecto abierto con al menos una colaboracion aceptada", () => {
    expect(estaIniciado(abierto(), haceDias(40))).toBe(true);
  });

  test("sin colaboracion aceptada no esta iniciado", () => {
    expect(estaIniciado(abierto(), null)).toBe(false);
  });

  test("un proyecto finalizado no esta iniciado", () => {
    expect(estaIniciado({ estado: "FINALIZADO" }, haceDias(40))).toBe(false);
  });
});

describe("seguimiento · ultima actualizacion", () => {
  test("toma la mas reciente entre avances, logros y aceptacion", () => {
    const resultado = ultimaActualizacion({
      avances: [{ fecha: haceDias(50) }, { fecha: haceDias(20) }],
      logros: [{ fecha: haceDias(35) }],
      ultimaAceptacion: haceDias(60),
    });
    expect(resultado).toEqual(haceDias(20));
  });

  test("sin avances ni logros cuenta desde la aceptacion", () => {
    expect(ultimaActualizacion({ ultimaAceptacion: haceDias(31) })).toEqual(haceDias(31));
  });

  test("la fecha de referencia suma la ultima resolucion de una revision", () => {
    expect(
      fechaDeReferencia({
        ultimaActualizacion: haceDias(60),
        ultimaResolucion: haceDias(10),
      }),
    ).toEqual(haceDias(10));
    expect(
      fechaDeReferencia({ ultimaActualizacion: haceDias(5), ultimaResolucion: null }),
    ).toEqual(haceDias(5));
  });
});

describe("seguimiento · debe marcarse", () => {
  const evaluar = (datos) => debeMarcarse({ ahora: hoy, dias: 30, ...datos });

  test("se marca cuando pasaron 30 dias o mas sin actualizaciones", () => {
    expect(evaluar({ proyecto: abierto(), ultimaAceptacion: haceDias(30) })).toBe(true);
    expect(evaluar({ proyecto: abierto(), ultimaAceptacion: haceDias(45) })).toBe(true);
  });

  test("no se marca antes del plazo", () => {
    expect(evaluar({ proyecto: abierto(), ultimaAceptacion: haceDias(29) })).toBe(false);
  });

  test("un avance reciente evita la marca aunque la aceptacion sea vieja", () => {
    const proyecto = abierto({ avances: [{ fecha: haceDias(3) }] });
    expect(evaluar({ proyecto, ultimaAceptacion: haceDias(90) })).toBe(false);
  });

  test("un logro reciente tambien evita la marca", () => {
    const proyecto = abierto({ logros: [{ fecha: haceDias(10) }] });
    expect(evaluar({ proyecto, ultimaAceptacion: haceDias(90) })).toBe(false);
  });

  test("sin colaboraciones aceptadas no se marca", () => {
    expect(evaluar({ proyecto: abierto(), ultimaAceptacion: null })).toBe(false);
  });

  test("una revision resuelta no se vuelve a crear hasta pasar otro periodo completo", () => {
    const base = { proyecto: abierto(), ultimaAceptacion: haceDias(90) };
    expect(evaluar({ ...base, ultimaResolucion: haceDias(10) })).toBe(false);
    expect(evaluar({ ...base, ultimaResolucion: haceDias(30) })).toBe(true);
  });

  test("respeta el plazo configurado", () => {
    const base = { proyecto: abierto(), ultimaAceptacion: haceDias(8) };
    expect(evaluar({ ...base, dias: 7 })).toBe(true);
    expect(evaluar({ ...base, dias: 10 })).toBe(false);
  });
});
