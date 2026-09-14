import {
  armarServices,
  crearProyectoDePrueba,
  crearColaboradorDePrueba,
  CODIGOS,
} from "../fixtures.js";
import { DomainError } from "../../src/errors/DomainError.js";
import { ConflictError } from "../../src/errors/ConflictError.js";
import { NotFoundError } from "../../src/errors/NotFoundError.js";

describe("ColaboracionService · anotar un colaborador", () => {
  let services;
  let proyecto;

  beforeEach(() => {
    services = armarServices();
    proyecto = crearProyectoDePrueba(services, { habilidades: [CODIGOS.node] }).proyecto;
  });

  test("se anota si tiene la habilidad requerida", () => {
    const colaborador = crearColaboradorDePrueba(services.colaboradorService, {
      habilidades: [CODIGOS.node],
    });

    const colaboracion = services.colaboracionService.registrar({
      proyectoId: proyecto.id,
      colaboradorId: colaborador.id,
    });

    expect(colaboracion.colaborador.id).toBe(colaborador.id);
    expect(services.colaboracionService.listarPorProyecto(proyecto.id)).toHaveLength(1);
  });

  // "Se debera validar que la persona cuente con al menos una de las
  // habilidades requeridas" — enunciado, primera entrega.
  test("sin ninguna de las habilidades requeridas tira DomainError", () => {
    const colaborador = crearColaboradorDePrueba(services.colaboradorService, {
      habilidades: [CODIGOS.react],
    });

    expect(() =>
      services.colaboracionService.registrar({
        proyectoId: proyecto.id,
        colaboradorId: colaborador.id,
      }),
    ).toThrow(DomainError);
  });

  test("anotarse dos veces al mismo proyecto tira ConflictError", () => {
    const colaborador = crearColaboradorDePrueba(services.colaboradorService);
    const anotar = () =>
      services.colaboracionService.registrar({
        proyectoId: proyecto.id,
        colaboradorId: colaborador.id,
      });

    anotar();
    expect(anotar).toThrow(ConflictError);
    expect(services.colaboracionService.listarPorProyecto(proyecto.id)).toHaveLength(1);
  });

  // "Luego de esto, ya no se pueden anotar personas colaboradoras al mismo"
  // — enunciado, primera entrega.
  test("no se puede anotar a un proyecto finalizado", () => {
    const colaborador = crearColaboradorDePrueba(services.colaboradorService);
    services.proyectoService.finalizar(proyecto.id);

    expect(() =>
      services.colaboracionService.registrar({
        proyectoId: proyecto.id,
        colaboradorId: colaborador.id,
      }),
    ).toThrow(ConflictError);
  });

  test("un proyecto que no existe tira NotFoundError", () => {
    const colaborador = crearColaboradorDePrueba(services.colaboradorService);
    expect(() =>
      services.colaboracionService.registrar({
        proyectoId: "no-existe",
        colaboradorId: colaborador.id,
      }),
    ).toThrow(NotFoundError);
  });
});

describe("ColaboracionService · listar por colaborador", () => {
  test("devuelve cada colaboracion con el proyecto al que pertenece", () => {
    const services = armarServices();
    const colaborador = crearColaboradorDePrueba(services.colaboradorService);
    const a = crearProyectoDePrueba(services, { titulo: "Uno" }).proyecto;
    const b = crearProyectoDePrueba(services, { titulo: "Dos" }).proyecto;

    [a, b].forEach((proyecto) =>
      services.colaboracionService.registrar({
        proyectoId: proyecto.id,
        colaboradorId: colaborador.id,
      }),
    );

    const resultado = services.colaboracionService.listarPorColaborador(colaborador.id);
    expect(resultado).toHaveLength(2);
    expect(resultado.map((r) => r.proyectoId).sort()).toEqual([a.id, b.id].sort());
  });
});
