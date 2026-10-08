import { armarServices, crearProyectoDePrueba } from "../fixtures.js";
import { NotFoundError } from "../../src/errors/NotFoundError.js";
import { ConflictError } from "../../src/errors/ConflictError.js";
import { DomainError } from "../../src/errors/DomainError.js";

// Avances: el historial del porcentaje de concrecion y los enlaces ("para dar
// trazabilidad", segunda entrega). Solo se agregan: no se editan ni se borran.
describe("AvanceService", () => {
  let services;
  let proyecto;

  beforeEach(async () => {
    services = await armarServices();
    ({ proyecto } = await crearProyectoDePrueba(services));
  });

  const registrar = (porcentajeConcrecion, enlaces = {}) =>
    services.avanceService.registrarAvanceParaProyecto(proyecto.id, {
      porcentajeConcrecion,
      urlSistema: "https://sistema.example.org",
      urlRepositorio: "https://github.com/ejemplo/repo",
      ...enlaces,
    });

  describe("registrar", () => {
    test("agrega el avance al historial, con id y fecha", async () => {
      const avance = await registrar(30);

      expect(avance.id).toEqual(expect.any(String));
      expect(avance.fecha).toBeInstanceOf(Date);
      expect(proyecto.avances).toEqual([avance]);
    });

    test("actualiza los valores actuales del proyecto", async () => {
      await registrar(30);
      await registrar(70, {
        urlSistema: "https://nuevo.example.org",
        urlRepositorio: "https://github.com/ejemplo/nuevo",
      });

      expect(proyecto).toMatchObject({
        porcentajeConcrecion: 70,
        urlSistema: "https://nuevo.example.org",
        urlRepositorio: "https://github.com/ejemplo/nuevo",
      });
    });

    test("conserva los avances anteriores: es un historial", async () => {
      await registrar(30);
      await registrar(70);

      expect(proyecto.avances.map((a) => a.porcentajeConcrecion)).toEqual([30, 70]);
    });

    test("el porcentaje tiene que superar al actual", async () => {
      await registrar(50);

      await expect(registrar(50)).rejects.toThrow(DomainError);
      await expect(registrar(40)).rejects.toThrow(DomainError);
      // El rechazado no queda registrado ni cambia el valor actual.
      expect(proyecto.avances).toHaveLength(1);
      expect(proyecto.porcentajeConcrecion).toBe(50);
    });

    test("el primer avance tiene que ser mayor a 0", async () => {
      await expect(registrar(0)).rejects.toThrow(DomainError);
    });

    test("en un proyecto finalizado tira ConflictError", async () => {
      await services.proyectoService.finalizar(proyecto.id);
      await expect(registrar(30)).rejects.toThrow(ConflictError);
    });

    test("en un proyecto que no existe tira NotFoundError", async () => {
      await expect(
        services.avanceService.registrarAvanceParaProyecto("no-existe", {
          porcentajeConcrecion: 30,
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("consultar", () => {
    test("lista el historial en el orden en que se cargo", async () => {
      const primero = await registrar(30);
      const segundo = await registrar(70);

      const avances = await services.avanceService.listarParaProyecto(proyecto.id);
      expect(avances.map((a) => a.id)).toEqual([primero.id, segundo.id]);
    });

    test("un proyecto sin avances devuelve una lista vacia", async () => {
      expect(await services.avanceService.listarParaProyecto(proyecto.id)).toEqual([]);
    });

    test("busca un avance por id", async () => {
      const avance = await registrar(30);
      const encontrado = await services.avanceService.buscarPorIdParaProyecto(
        proyecto.id,
        avance.id,
      );
      expect(encontrado).toBe(avance);
    });

    test("un avance que no existe tira NotFoundError", async () => {
      await expect(
        services.avanceService.buscarPorIdParaProyecto(proyecto.id, "no-existe"),
      ).rejects.toThrow(NotFoundError);
    });

    test("el historial de un proyecto finalizado se puede consultar", async () => {
      await registrar(30);
      await services.proyectoService.finalizar(proyecto.id);

      expect(await services.avanceService.listarParaProyecto(proyecto.id)).toHaveLength(
        1,
      );
    });
  });
});
