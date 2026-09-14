import { Proyecto } from "../../src/domain/Proyecto.js";
import { Colaborador } from "../../src/domain/Colaborador.js";
import { Habilidad } from "../../src/domain/Habilidad.js";
import { PROYECTO_ESTADO } from "../../src/domain/enums/PROYECTO_ESTADO.js";

const node = new Habilidad({ titulo: "Desarrollo Node" });
const react = new Habilidad({ titulo: "Desarrollo Web React" });

function proyectoAbierto(habilidades = [node]) {
  return new Proyecto({
    titulo: "Sitio institucional",
    descripcion: "Proyecto de prueba",
    compromisoEsperado: { cantidadHoras: 5, periodo: "HS_MENSUALES" },
    habilidadesNecesarias: [...habilidades],
  });
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

describe("Proyecto · habilidades requeridas", () => {
  test("agregar la misma dos veces no la duplica", () => {
    const proyecto = proyectoAbierto();
    proyecto.agregarHabilidadRequerida(new Habilidad({ titulo: "Desarrollo Node" }));
    expect(proyecto.habilidadesNecesarias).toHaveLength(1);
  });

  test("cumple si el colaborador tiene AL MENOS una de las requeridas", () => {
    const proyecto = proyectoAbierto([node, react]);
    const colaborador = new Colaborador({ cuentaGit: "octocat" });
    colaborador.agregarHabilidad(react);
    expect(proyecto.cumpleAlgunaHabilidadRequerida(colaborador)).toBe(true);
  });

  test("no cumple si no tiene ninguna", () => {
    const proyecto = proyectoAbierto([node]);
    const colaborador = new Colaborador({ cuentaGit: "octocat" });
    colaborador.agregarHabilidad(react);
    expect(proyecto.cumpleAlgunaHabilidadRequerida(colaborador)).toBe(false);
  });
});

describe("Habilidad · igualdad por codigo normalizado", () => {
  test("mismo titulo con distinta capitalizacion y acentos es la misma habilidad", () => {
    const a = new Habilidad({ titulo: "Diseño UX UI" });
    const b = new Habilidad({ titulo: "diseno ux ui" });
    expect(a.codigo).toBe("diseno_ux_ui");
    expect(a.equals(b)).toBe(true);
  });

  test("no se compara igual contra algo que no es una Habilidad", () => {
    expect(node.equals({ codigo: "desarrollo_node" })).toBe(false);
  });
});
