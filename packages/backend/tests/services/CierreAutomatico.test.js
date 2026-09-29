import { armarServices, crearColectivoDePrueba, datosDePerfil, CODIGOS } from "../fixtures.js";
import { DomainError } from "../../src/errors/DomainError.js";
import { ConflictError } from "../../src/errors/ConflictError.js";

// Requerimiento adicional 10: cierre automatico de proyectos.
describe("Cierre automatico de proyectos", () => {
  const HOY = new Date("2026-10-01T12:00:00Z");
  const MANANA = new Date("2026-10-02T12:00:00Z");
  const PASADO = new Date("2026-10-03T12:00:00Z");

  let services;
  let proyecto;
  let pendiente;

  beforeEach(async () => {
    services = await armarServices();
    const colectivo = await crearColectivoDePrueba(services.colectivoService);
    proyecto = await services.proyectoService.crear(
      {
        colectivoId: colectivo.id,
        titulo: "Sitio",
        descripcion: "...",
        perfiles: [datosDePerfil({ requeridas: [CODIGOS.node] })],
        modoAceptacion: "REVISION_MANUAL",
        fechaCierre: MANANA,
      },
      HOY,
    );
    const ada = await services.colaboradorService.crear({
      cuentaGit: "ada",
      codigosHabilidades: [CODIGOS.node],
    });
    pendiente = await services.colaboracionService.registrar(
      { proyectoId: proyecto.id, colaboradorId: ada.id },
      HOY,
    );
  });

  test("antes de la fecha no cierra nada", async () => {
    expect(await services.proyectoService.cerrarVencidos(HOY)).toEqual([]);
    expect(proyecto.estaAbierto()).toBe(true);
  });

  test("pasada la fecha cierra el proyecto y rechaza las postulaciones pendientes", async () => {
    const cerrados = await services.proyectoService.cerrarVencidos(PASADO);

    expect(cerrados.map((p) => p.id)).toEqual([proyecto.id]);
    const guardado = await services.proyectoService.buscarPorId(proyecto.id);
    expect(guardado.estado).toBe("FINALIZADO");
    expect(guardado.fechaFinalizacion).toEqual(PASADO);
    expect(guardado.colaboraciones[0].estado).toBe("RECHAZADA");
  });

  test("aunque el job todavia no haya pasado, despues de la fecha no se puede postular", async () => {
    const grace = await services.colaboradorService.crear({
      cuentaGit: "grace",
      codigosHabilidades: [CODIGOS.node],
    });

    await expect(
      services.colaboracionService.registrar(
        { proyectoId: proyecto.id, colaboradorId: grace.id },
        PASADO,
      ),
    ).rejects.toThrow(ConflictError);
    expect(proyecto.estado).toBe("FINALIZADO");
  });

  test("ni aceptar una postulacion que habia quedado pendiente", async () => {
    await expect(
      services.colaboracionService.aceptar(proyecto.id, pendiente.id, PASADO),
    ).rejects.toThrow(ConflictError);
  });

  test("el cierre manual tiene las mismas consecuencias", async () => {
    await services.proyectoService.finalizar(proyecto.id, HOY);
    expect(pendiente.estado).toBe("RECHAZADA");
  });

  test("la fecha de cierre tiene que ser futura, y se puede sacar", async () => {
    await expect(
      services.proyectoService.actualizar(proyecto.id, { fechaCierre: HOY }, HOY),
    ).rejects.toThrow(DomainError);

    const actualizado = await services.proyectoService.actualizar(
      proyecto.id,
      { fechaCierre: null },
      HOY,
    );
    expect(actualizado.fechaCierre).toBeNull();
    expect(await services.proyectoService.cerrarVencidos(PASADO)).toEqual([]);
  });
});
