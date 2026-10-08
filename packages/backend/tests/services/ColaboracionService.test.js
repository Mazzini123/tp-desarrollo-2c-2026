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

  beforeEach(async () => {
    services = await armarServices();
    proyecto = (await crearProyectoDePrueba(services, { habilidades: [CODIGOS.node] })).proyecto;
  });

  test("se anota si tiene la habilidad requerida", async () => {
    const colaborador = await crearColaboradorDePrueba(services.colaboradorService, {
      habilidades: [CODIGOS.node],
    });

    const colaboracion = await services.colaboracionService.registrar({
      proyectoId: proyecto.id,
      colaboradorId: colaborador.id,
    });

    expect(colaboracion.colaborador.id).toBe(colaborador.id);
    expect(await services.colaboracionService.listarPorProyecto(proyecto.id)).toHaveLength(1);
  });

  // El colaborador tiene que cumplir TODAS las habilidades requeridas de al
  // menos uno de los perfiles del proyecto.
  test("sin las habilidades requeridas de ningun perfil tira DomainError", async () => {
    const colaborador = await crearColaboradorDePrueba(services.colaboradorService, {
      habilidades: [CODIGOS.react],
    });

    await expect(
      services.colaboracionService.registrar({
        proyectoId: proyecto.id,
        colaboradorId: colaborador.id,
      }),
    ).rejects.toThrow(DomainError);
  });

  test("anotarse dos veces al mismo proyecto tira ConflictError", async () => {
    const colaborador = await crearColaboradorDePrueba(services.colaboradorService);
    const anotar = () =>
      services.colaboracionService.registrar({
        proyectoId: proyecto.id,
        colaboradorId: colaborador.id,
      });

    await anotar();
    await expect(anotar()).rejects.toThrow(ConflictError);
    expect(await services.colaboracionService.listarPorProyecto(proyecto.id)).toHaveLength(1);
  });

  // "Luego de esto, ya no se pueden anotar personas colaboradoras al mismo"
  // — enunciado, primera entrega.
  test("no se puede anotar a un proyecto finalizado", async () => {
    const colaborador = await crearColaboradorDePrueba(services.colaboradorService);
    await services.proyectoService.finalizar(proyecto.id);

    await expect(
      services.colaboracionService.registrar({
        proyectoId: proyecto.id,
        colaboradorId: colaborador.id,
      }),
    ).rejects.toThrow(ConflictError);
  });

  test("un proyecto que no existe tira NotFoundError", async () => {
    const colaborador = await crearColaboradorDePrueba(services.colaboradorService);
    await expect(
      services.colaboracionService.registrar({
        proyectoId: "no-existe",
        colaboradorId: colaborador.id,
      }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("ColaboracionService · listar por colaborador", () => {
  test("devuelve cada colaboracion con el proyecto al que pertenece", async () => {
    const services = await armarServices();
    const colaborador = await crearColaboradorDePrueba(services.colaboradorService);
    const a = (await crearProyectoDePrueba(services, { titulo: "Uno" })).proyecto;
    const b = (await crearProyectoDePrueba(services, { titulo: "Dos" })).proyecto;

    // for...of y no forEach: forEach no espera a las promesas.
    for (const proyecto of [a, b]) {
      await services.colaboracionService.registrar({
        proyectoId: proyecto.id,
        colaboradorId: colaborador.id,
      });
    }

    const resultado = await services.colaboracionService.listarPorColaborador(colaborador.id);
    expect(resultado).toHaveLength(2);
    expect(resultado.map((r) => r.proyectoId).sort()).toEqual([a.id, b.id].sort());
  });
});
