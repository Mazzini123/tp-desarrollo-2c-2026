import mongoose from "mongoose";
import { ProyectoModel } from "../../src/models/ProyectoModel.js";
import { ColaboradorModel } from "../../src/models/ColaboradorModel.js";
import { HabilidadModel } from "../../src/models/HabilidadModel.js";
import { ESTADO_BUSQUEDA } from "../../src/domain/enums/ESTADO_BUSQUEDA.js";
import {
  cierreVencido,
  cumpleHabilidadesRequeridas,
  estadoDeBusqueda,
  perfilAceptaPostulaciones,
  proyectoAceptaPostulaciones,
} from "../../src/services/reglasDeBusqueda.js";

// Funciones puras: no hace falta base, new ProyectoModel() arma el documento.
const node = new HabilidadModel({ titulo: "Desarrollo Node" });
const react = new HabilidadModel({ titulo: "Desarrollo Web React" });

function perfilQueRequiere(habilidades, extra = {}) {
  return {
    descripcion: "Perfil de prueba",
    compromiso: { cantidadHoras: 5, periodo: "HS_MENSUALES" },
    modalidadColaboracion: "GRATUITA",
    habilidadesRequeridas: habilidades,
    ...extra,
  };
}

function proyectoCon(...perfiles) {
  const proyecto = new ProyectoModel({
    colectivoId: new mongoose.Types.ObjectId(),
    datosDelColectivo: { nombre: "Fundacion Ejemplo", tipoColectivo: "FUNDACION" },
    titulo: "Sitio institucional",
    descripcion: "Proyecto de prueba",
  });
  perfiles.forEach((p) => proyecto.agregarPerfil(p));
  return proyecto;
}

function colaboradorCon(...habilidades) {
  const colaborador = new ColaboradorModel({ cuentaGit: "octocat" });
  habilidades.forEach((h) => colaborador.agregarHabilidad(h));
  return colaborador;
}

const AYER = new Date(Date.now() - 86_400_000);
const MANANA = new Date(Date.now() + 86_400_000);

describe("cumpleHabilidadesRequeridas", () => {
  test("cumple si tiene TODAS las requeridas", () => {
    const [perfil] = proyectoCon(perfilQueRequiere([node, react])).perfiles;
    expect(cumpleHabilidadesRequeridas(perfil, colaboradorCon(node, react))).toBe(true);
  });

  test("no cumple si le falta una", () => {
    const [perfil] = proyectoCon(perfilQueRequiere([node, react])).perfiles;
    expect(cumpleHabilidadesRequeridas(perfil, colaboradorCon(react))).toBe(false);
  });

  test("un perfil sin requeridas no matchea a nadie", () => {
    const [perfil] = proyectoCon(perfilQueRequiere([])).perfiles;
    expect(cumpleHabilidadesRequeridas(perfil, colaboradorCon(node))).toBe(false);
  });
});

describe("cuando se aceptan postulaciones", () => {
  test("un perfil con la busqueda vencida no acepta", () => {
    const [perfil] = proyectoCon(
      perfilQueRequiere([node], { fechaCierreBusqueda: AYER }),
    ).perfiles;
    expect(perfilAceptaPostulaciones(perfil)).toBe(false);
  });

  test("un proyecto acepta si algun perfil acepta", () => {
    const proyecto = proyectoCon(
      perfilQueRequiere([node], { fechaCierreBusqueda: AYER }),
      perfilQueRequiere([react], { fechaCierreBusqueda: MANANA }),
    );
    expect(proyectoAceptaPostulaciones(proyecto)).toBe(true);
  });

  test("un proyecto finalizado no acepta", () => {
    const proyecto = proyectoCon(perfilQueRequiere([node]));
    proyecto.finalizarProyecto();
    expect(proyectoAceptaPostulaciones(proyecto)).toBe(false);
  });

  test("el cierre vence solo con fecha pasada y proyecto abierto", () => {
    const proyecto = proyectoCon(perfilQueRequiere([node]));
    expect(cierreVencido(proyecto, new Date())).toBe(false);
    proyecto.fechaCierre = AYER;
    expect(cierreVencido(proyecto, new Date())).toBe(true);
  });
});

describe("estadoDeBusqueda", () => {
  test("ABIERTA, CERRADA por fecha y CERRADA por proyecto finalizado", () => {
    const proyecto = proyectoCon(
      perfilQueRequiere([node]),
      perfilQueRequiere([react], { fechaCierreBusqueda: AYER }),
    );
    const [abierto, vencido] = proyecto.perfiles;
    expect(estadoDeBusqueda(abierto, proyecto)).toBe(ESTADO_BUSQUEDA.ABIERTA);
    expect(estadoDeBusqueda(vencido, proyecto)).toBe(ESTADO_BUSQUEDA.CERRADA);
    proyecto.finalizarProyecto();
    expect(estadoDeBusqueda(abierto, proyecto)).toBe(ESTADO_BUSQUEDA.CERRADA);
  });

  test("el virtual del modelo expone la misma regla en el JSON", () => {
    const proyecto = proyectoCon(perfilQueRequiere([node]));
    expect(proyecto.toJSON().perfiles[0].estadoBusqueda).toBe(ESTADO_BUSQUEDA.ABIERTA);
  });
});
