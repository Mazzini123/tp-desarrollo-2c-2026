import { armarServices, datosDePerfil, CODIGOS } from "../fixtures.js";
import { Logro } from "../../src/domain/Logro.js";
import { NotFoundError } from "../../src/errors/NotFoundError.js";

// Requerimiento adicional 19: linea de tiempo de un colectivo.
describe("Timeline de un colectivo", () => {
  const dia = (n) => new Date(`2026-10-${String(n).padStart(2, "0")}T12:00:00Z`);

  test("muestra alta, proyectos, logros, colaboraciones cerradas y cierres, en orden", async () => {
    const services = await armarServices();
    const colectivo = await services.colectivoService.crear({
      nombre: "Huerta",
      descripcion: "...",
      tipoColectivo: "ASAMBLEA",
    });
    colectivo.fechaAlta = dia(1);

    const proyecto = await services.proyectoService.crear(
      {
        colectivoId: colectivo.id,
        titulo: "Mapa",
        descripcion: "...",
        perfiles: [datosDePerfil({ requeridas: [CODIGOS.node] })],
      },
      dia(2),
    );
    const ada = await services.colaboradorService.crear({
      nombre: "Ada",
      apellido: "Lovelace",
      codigosHabilidades: [CODIGOS.node],
    });
    const grace = await services.colaboradorService.crear({
      cuentaGit: "grace",
      codigosHabilidades: [CODIGOS.node],
    });
    const publica = await services.colaboracionService.registrar(
      { proyectoId: proyecto.id, colaboradorId: ada.id },
      dia(3),
    );
    await services.colaboracionService.registrar(
      { proyectoId: proyecto.id, colaboradorId: grace.id, esPublica: false },
      dia(3),
    );
    await services.colaboracionService.finalizar(proyecto.id, publica.id, dia(4));
    proyecto.agregarLogro(new Logro({ titulo: "Primer mapa", descripcion: "...", fecha: dia(5) }));
    await services.proyectoService.finalizar(proyecto.id, dia(6));

    const eventos = await services.colectivoService.timeline(colectivo.id);

    expect(eventos.map((e) => e.tipo)).toEqual([
      "ALTA_DEL_COLECTIVO",
      "PROYECTO_CREADO",
      "COLABORACION_CERRADA",
      "LOGRO",
      "PROYECTO_FINALIZADO",
      "COLABORACION_CERRADA",
    ]);
    expect(eventos[2].colaborador).toEqual({ id: ada.id, nombre: "Ada Lovelace" });
    // La de grace se cerro con el proyecto, y era anonima.
    expect(eventos[5].colaborador).toBeNull();
    expect(eventos[3].logro.titulo).toBe("Primer mapa");
  });

  test("un colectivo que no existe tira NotFoundError", async () => {
    const services = await armarServices();
    await expect(services.colectivoService.timeline("no-existe")).rejects.toThrow(NotFoundError);
  });
});
