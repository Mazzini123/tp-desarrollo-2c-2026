import { Proyecto } from "../../src/domain/Proyecto.js";
import { Perfil } from "../../src/domain/Perfil.js";
import { Compromiso } from "../../src/domain/Compromiso.js";
import { Colaborador } from "../../src/domain/Colaborador.js";
import { HabilidadModel } from "../../src/models/HabilidadModel.js";
import { PROYECTO_ESTADO } from "../../src/domain/enums/PROYECTO_ESTADO.js";

const node = new HabilidadModel({ titulo: "Desarrollo Node" });
const react = new HabilidadModel({ titulo: "Desarrollo Web React" });

function perfilQueRequiere(...habilidades) {
  const perfil = new Perfil({
    descripcion: "Perfil de prueba",
    compromiso: new Compromiso({ cantidadHoras: 5, periodo: "HS_MENSUALES" }),
    modalidadColaboracion: "GRATUITA",
  });
  habilidades.forEach((h) => perfil.agregarHabilidadRequerida(h));
  return perfil;
}

function proyectoAbierto(...perfiles) {
  const proyecto = new Proyecto({
    titulo: "Sitio institucional",
    descripcion: "Proyecto de prueba",
  });
  perfiles.forEach((p) => proyecto.agregarPerfil(p));
  return proyecto;
}

function colaboradorCon(...habilidades) {
  const colaborador = new Colaborador({ cuentaGit: "octocat" });
  habilidades.forEach((h) => colaborador.agregarHabilidad(h));
  return colaborador;
}

describe("Proyecto · ciclo de vida", () => {
  test("nace abierto", () => {
    const proyecto = proyectoAbierto();
    expect(proyecto.estado).toBe(PROYECTO_ESTADO.ABIERTO);
    expect(proyecto.estaAbierto()).toBe(true);
  });

  test("finalizar lo cierra y ya no esta abierto", () => {
    const proyecto = proyectoAbierto();
    proyecto.finalizarProyecto();
    expect(proyecto.estado).toBe(PROYECTO_ESTADO.FINALIZADO);
    expect(proyecto.estaAbierto()).toBe(false);
  });
});

describe("Proyecto · perfiles", () => {
  test("cumple si el colaborador tiene TODAS las requeridas de algun perfil", () => {
    const proyecto = proyectoAbierto(perfilQueRequiere(node, react));
    expect(proyecto.cumpleAlgunPerfil(colaboradorCon(node, react))).toBe(true);
  });

  test("no cumple si le falta una requerida de cada perfil", () => {
    const proyecto = proyectoAbierto(perfilQueRequiere(node, react));
    expect(proyecto.cumpleAlgunPerfil(colaboradorCon(react))).toBe(false);
  });

  test("alcanza con cumplir uno solo de los perfiles", () => {
    const proyecto = proyectoAbierto(perfilQueRequiere(node), perfilQueRequiere(react));
    expect(proyecto.cumpleAlgunPerfil(colaboradorCon(react))).toBe(true);
  });

  test("quitarPerfil lo saca por id", () => {
    const perfil = perfilQueRequiere(node);
    const proyecto = proyectoAbierto(perfil, perfilQueRequiere(react));
    proyecto.quitarPerfil(perfil);
    expect(proyecto.perfiles).toHaveLength(1);
  });
});

describe("Habilidad · igualdad por codigo normalizado", () => {
  test("mismo titulo con distinta capitalizacion y acentos es la misma habilidad", () => {
    const a = new HabilidadModel({ titulo: "Diseño UX UI" });
    const b = new HabilidadModel({ titulo: "diseno ux ui" });
    expect(a.codigo).toBe("diseno_ux_ui");
    expect(a.equals(b)).toBe(true);
  });

  // equals compara por codigo, no por clase: asi la habilidad del catalogo y
  // la copia guardada dentro de un perfil o de una persona son la misma.
  test("distinto codigo no es la misma habilidad", () => {
    expect(node.equals(react)).toBe(false);
    expect(node.equals(null)).toBe(false);
  });
});
