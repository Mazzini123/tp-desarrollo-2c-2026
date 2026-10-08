import { armarServices, crearProyectoDePrueba } from "../fixtures.js";
import { NotFoundError } from "../../src/errors/NotFoundError.js";
import { ConflictError } from "../../src/errors/ConflictError.js";
import { DomainError } from "../../src/errors/DomainError.js";

// CRUD de logros (requerimiento minimo 3.b de la segunda entrega).
describe("LogroService", () => {
  let services;
  let proyecto;

  beforeEach(async () => {
    services = await armarServices();
    ({ proyecto } = await crearProyectoDePrueba(services));
  });

  const crear = (datos = {}) =>
    services.logroService.crearParaProyecto(proyecto.id, {
      titulo: "Primer deploy",
      descripcion: "La app quedo publicada",
      ...datos,
    });

  describe("crear", () => {
    test("agrega el logro al proyecto, con id y fecha", async () => {
      const logro = await crear();

      expect(logro.id).toEqual(expect.any(String));
      expect(logro.fecha).toBeInstanceOf(Date);
      expect(proyecto.logros).toEqual([logro]);
    });

    test("no permite dos logros con el mismo titulo en un proyecto", async () => {
      await crear();
      await expect(crear()).rejects.toThrow(ConflictError);
    });

    test("en un proyecto finalizado tira ConflictError", async () => {
      await services.proyectoService.finalizar(proyecto.id);
      await expect(crear()).rejects.toThrow(ConflictError);
    });

    test("en un proyecto que no existe tira NotFoundError", async () => {
      await expect(
        services.logroService.crearParaProyecto("no-existe", {
          titulo: "x",
          descripcion: "y",
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("leer", () => {
    test("lista los logros del proyecto", async () => {
      const uno = await crear({ titulo: "Uno" });
      const dos = await crear({ titulo: "Dos" });

      const logros = await services.logroService.conseguirTodosDeProyecto(proyecto.id);
      expect(logros.map((l) => l.id)).toEqual([uno.id, dos.id]);
    });

    test("busca un logro por id", async () => {
      const logro = await crear();
      const encontrado = await services.logroService.conseguirPorIdParaProyecto(
        proyecto.id,
        logro.id,
      );
      expect(encontrado).toBe(logro);
    });

    test("un logro que no existe tira NotFoundError", async () => {
      await expect(
        services.logroService.conseguirPorIdParaProyecto(proyecto.id, "no-existe"),
      ).rejects.toThrow(NotFoundError);
    });

    test("se pueden leer los logros de un proyecto finalizado", async () => {
      await crear();
      await services.proyectoService.finalizar(proyecto.id);

      const logros = await services.logroService.conseguirTodosDeProyecto(proyecto.id);
      expect(logros).toHaveLength(1);
    });
  });

  describe("actualizar", () => {
    test("cambia titulo y descripcion, y conserva id y fecha", async () => {
      const logro = await crear();
      const { id, fecha } = logro;

      const actualizado = await services.logroService.actualizarParaProyecto(
        proyecto.id,
        logro.id,
        { titulo: "Deploy en Oracle", descripcion: "Con Docker" },
      );

      expect(actualizado).toMatchObject({
        id,
        fecha,
        titulo: "Deploy en Oracle",
        descripcion: "Con Docker",
      });
    });

    test("puede mantener su propio titulo", async () => {
      const logro = await crear();
      await expect(
        services.logroService.actualizarParaProyecto(proyecto.id, logro.id, {
          titulo: logro.titulo,
          descripcion: "Otra descripcion",
        }),
      ).resolves.toMatchObject({ descripcion: "Otra descripcion" });
    });

    test("no puede tomar el titulo de otro logro", async () => {
      await crear({ titulo: "Uno" });
      const dos = await crear({ titulo: "Dos" });

      await expect(
        services.logroService.actualizarParaProyecto(proyecto.id, dos.id, {
          titulo: "Uno",
          descripcion: "...",
        }),
      ).rejects.toThrow(ConflictError);
    });

    test("sin titulo o sin descripcion tira DomainError", async () => {
      const logro = await crear();
      const actualizar = (datos) =>
        services.logroService.actualizarParaProyecto(proyecto.id, logro.id, datos);

      await expect(actualizar({ titulo: "", descripcion: "x" })).rejects.toThrow(
        DomainError,
      );
      await expect(actualizar({ titulo: "x", descripcion: "" })).rejects.toThrow(
        DomainError,
      );
    });

    test("un logro que no existe tira NotFoundError", async () => {
      await expect(
        services.logroService.actualizarParaProyecto(proyecto.id, "no-existe", {
          titulo: "x",
          descripcion: "y",
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("eliminar", () => {
    test("saca el logro del proyecto", async () => {
      const uno = await crear({ titulo: "Uno" });
      const dos = await crear({ titulo: "Dos" });

      await services.logroService.eliminarParaProyecto(proyecto.id, uno.id);

      expect(proyecto.logros.map((l) => l.id)).toEqual([dos.id]);
    });

    test("un logro que no existe tira NotFoundError", async () => {
      await expect(
        services.logroService.eliminarParaProyecto(proyecto.id, "no-existe"),
      ).rejects.toThrow(NotFoundError);
    });

    test("en un proyecto finalizado tira ConflictError", async () => {
      const logro = await crear();
      await services.proyectoService.finalizar(proyecto.id);

      await expect(
        services.logroService.eliminarParaProyecto(proyecto.id, logro.id),
      ).rejects.toThrow(ConflictError);
    });
  });
});
