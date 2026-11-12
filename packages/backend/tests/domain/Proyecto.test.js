import mongoose from "mongoose";
import { ProyectoModel } from "../../src/models/ProyectoModel.js";
import { HabilidadModel } from "../../src/models/HabilidadModel.js";
import { PROYECTO_ESTADO } from "../../src/domain/enums/PROYECTO_ESTADO.js";

const node = new HabilidadModel({ titulo: "Desarrollo Node" });
const react = new HabilidadModel({ titulo: "Desarrollo Web React" });

// Los datos de un perfil: el subdocumento lo crea proyecto.agregarPerfil().
function perfilQueRequiere(...habilidades) {
  return {
    descripcion: "Perfil de prueba",
    compromiso: { cantidadHoras: 5, periodo: "HS_MENSUALES" },
    modalidadColaboracion: "GRATUITA",
    habilidadesRequeridas: habilidades,
  };
}

// Un proyecto pertenece a un colectivo (guarda su id y una copia de sus
// datos). No hace falta una base: new ProyectoModel() arma el documento.
function proyectoAbierto(...perfiles) {
  const proyecto = new ProyectoModel({
    colectivoId: new mongoose.Types.ObjectId(),
    datosDelColectivo: { nombre: "Fundacion Ejemplo", tipoColectivo: "FUNDACION" },
    titulo: "Sitio institucional",
    descripcion: "Proyecto de prueba",
  });
  perfiles.forEach((p) => proyecto.agregarPerfil(p));
  return proyecto;
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
  test("quitarPerfil lo saca por id", () => {
    const proyecto = proyectoAbierto(perfilQueRequiere(node), perfilQueRequiere(react));
    const [primero, segundo] = proyecto.perfiles;
    proyecto.quitarPerfil(primero);
    expect(proyecto.perfiles.map((p) => p.id)).toEqual([segundo.id]);
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
