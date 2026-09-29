import { armarServices, crearColectivoDePrueba, datosDePerfil, CODIGOS } from "../fixtures.js";
import { DomainError } from "../../src/errors/DomainError.js";
import { ConflictError } from "../../src/errors/ConflictError.js";
import { NotFoundError } from "../../src/errors/NotFoundError.js";

// Requerimiento adicional 8: aceptacion y rechazo automatico de postulaciones.
describe("Postulaciones", () => {
  let services;
  let colectivo;
  let numero;

  beforeEach(async () => {
    services = await armarServices();
    colectivo = await crearColectivoDePrueba(services.colectivoService);
    numero = 0;
  });

  function crearProyecto(configuracion = {}) {
    return services.proyectoService.crear({
      colectivoId: colectivo.id,
      titulo: "Sitio",
      descripcion: "...",
      perfiles: [datosDePerfil({ requeridas: [CODIGOS.node] })],
      ...configuracion,
    });
  }

  async function postular(proyecto) {
    numero += 1;
    const colaborador = await services.colaboradorService.crear({
      cuentaGit: `persona-${numero}`,
      codigosHabilidades: [CODIGOS.node],
    });
    return services.colaboracionService.registrar({
      proyectoId: proyecto.id,
      colaboradorId: colaborador.id,
    });
  }

  describe("TODO_SUMA (el modo por defecto)", () => {
    test("acepta cada postulacion en el momento", async () => {
      const proyecto = await crearProyecto();
      expect(proyecto.modoAceptacion).toBe("TODO_SUMA");
      expect((await postular(proyecto)).estado).toBe("ACEPTADA");
    });

    test("no se puede combinar con un limite de vacantes", async () => {
      await expect(crearProyecto({ modoAceptacion: "TODO_SUMA", limiteVacantes: 2 })).rejects.toThrow(
        DomainError,
      );
    });
  });

  describe("HASTA_LLENAR_VACANTES", () => {
    test("deja pendientes hasta llegar al limite, y ahi acepta a todas", async () => {
      const proyecto = await crearProyecto({
        modoAceptacion: "HASTA_LLENAR_VACANTES",
        limiteVacantes: 2,
      });

      const primera = await postular(proyecto);
      expect(primera.estado).toBe("PENDIENTE");

      const segunda = await postular(proyecto);
      expect(segunda.estado).toBe("ACEPTADA");
      expect(primera.estado).toBe("ACEPTADA");
    });

    test("con el cupo lleno la postulacion queda cerrada", async () => {
      const proyecto = await crearProyecto({
        modoAceptacion: "HASTA_LLENAR_VACANTES",
        limiteVacantes: 1,
      });
      await postular(proyecto);
      await expect(postular(proyecto)).rejects.toThrow(ConflictError);
    });

    test("sin limite no se puede usar", async () => {
      await expect(crearProyecto({ modoAceptacion: "HASTA_LLENAR_VACANTES" })).rejects.toThrow(
        DomainError,
      );
    });

    test("a quienes quedaron esperando se les avisa que fueron aceptadas", async () => {
      const proyecto = await crearProyecto({
        modoAceptacion: "HASTA_LLENAR_VACANTES",
        limiteVacantes: 2,
      });
      const primera = await postular(proyecto);
      await postular(proyecto);

      const bandeja = await services.notificacionService.listar(primera.colaborador.id);
      expect(bandeja.items.map((n) => n.tipo)).toEqual(["POSTULACION_ACEPTADA"]);
    });
  });

  describe("REVISION_MANUAL", () => {
    let proyecto;

    beforeEach(async () => {
      proyecto = await crearProyecto({ modoAceptacion: "REVISION_MANUAL", limiteVacantes: 1 });
    });

    test("nada se resuelve solo", async () => {
      expect((await postular(proyecto)).estado).toBe("PENDIENTE");
      expect((await postular(proyecto)).estado).toBe("PENDIENTE");
    });

    test("aceptar a mano llena el cupo pero no rechaza sola a las demas", async () => {
      const a = await postular(proyecto);
      const b = await postular(proyecto);

      await services.colaboracionService.aceptar(proyecto.id, a.id);

      expect(a.estado).toBe("ACEPTADA");
      expect(b.estado).toBe("PENDIENTE");
      await expect(services.colaboracionService.aceptar(proyecto.id, b.id)).rejects.toThrow(
        ConflictError,
      );
      await expect(postular(proyecto)).rejects.toThrow(ConflictError);
    });

    test("rechazar a mano deja la postulacion rechazada y avisa", async () => {
      const a = await postular(proyecto);
      const rechazada = await services.colaboracionService.rechazar(proyecto.id, a.id);

      expect(rechazada.estado).toBe("RECHAZADA");
      expect(rechazada.fechaResolucion).toBeInstanceOf(Date);
      const bandeja = await services.notificacionService.listar(a.colaborador.id);
      expect(bandeja.items[0].tipo).toBe("POSTULACION_RECHAZADA");
    });

    test("no se puede resolver dos veces la misma postulacion", async () => {
      const a = await postular(proyecto);
      await services.colaboracionService.rechazar(proyecto.id, a.id);
      await expect(services.colaboracionService.aceptar(proyecto.id, a.id)).rejects.toThrow(
        ConflictError,
      );
    });

    test("una colaboracion que no existe tira NotFoundError", async () => {
      await expect(services.colaboracionService.aceptar(proyecto.id, "no-existe")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("cambiar la configuracion", () => {
    test("pasar de revision manual a TODO_SUMA acepta a las pendientes", async () => {
      const proyecto = await crearProyecto({ modoAceptacion: "REVISION_MANUAL" });
      const a = await postular(proyecto);

      await services.proyectoService.actualizar(proyecto.id, { modoAceptacion: "TODO_SUMA" });

      expect(a.estado).toBe("ACEPTADA");
    });

    test("el limite no puede quedar por debajo de las ya aceptadas", async () => {
      const proyecto = await crearProyecto();
      await postular(proyecto);
      await postular(proyecto);

      await expect(
        services.proyectoService.actualizar(proyecto.id, {
          modoAceptacion: "REVISION_MANUAL",
          limiteVacantes: 1,
        }),
      ).rejects.toThrow(DomainError);
    });
  });
});
