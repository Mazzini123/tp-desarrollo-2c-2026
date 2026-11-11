import { Proyecto } from "../../src/domain/Proyecto.js";
import { Colectivo } from "../../src/domain/Colectivo.js";
import { Colaborador } from "../../src/domain/Colaborador.js";

const proyecto = (datos = {}) =>
  Object.assign(new Proyecto(), {
    id: "p1",
    porcentajeConcrecion: 0,
    logros: [],
    avances: [],
    perfiles: [],
    ...datos,
  });

describe("Proyecto · colecciones, sin Mongoose", () => {
  test("agrega y quita logros", () => {
    const p = proyecto();
    const logro = Object.assign(p.agregarLogro({ titulo: "Primer mapa" }), { id: "l1" });

    expect(p.logros).toEqual([logro]);
    p.quitarLogro(logro);
    expect(p.logros).toEqual([]);
  });

  test("agrega avances y conoce el ultimo", () => {
    const p = proyecto();
    p.agregarAvance({ porcentajeConcrecion: 20 });
    const ultimo = p.agregarAvance({ porcentajeConcrecion: 60 });

    expect(p.ultimoAvance()).toBe(ultimo);
  });
});

describe("Colectivo y Colaborador · datos estructurales", () => {
  test("el colectivo agrega, consulta y quita medios de contacto", () => {
    const c = Object.assign(new Colectivo(), { mediosDeContacto: [] });
    const email = { tipo: "EMAIL", valor: "a@b.com" };

    c.agregarMedioDeContacto(email);
    expect(c.tieneMedioDeContacto({ ...email })).toBe(true);
    c.quitarMedioDeContacto(email);
    expect(c.tieneMedioDeContacto(email)).toBe(false);
  });

  test("la baja registra la fecha", () => {
    const fecha = new Date();
    const colectivo = Object.assign(new Colectivo(), { fechaBaja: null });
    const persona = Object.assign(new Colaborador(), { fechaBaja: null });

    colectivo.darDeBaja(fecha);
    persona.darDeBaja(fecha);

    expect(colectivo.estaDadoDeBaja()).toBe(true);
    expect(persona.estaDadaDeBaja()).toBe(true);
  });
});
