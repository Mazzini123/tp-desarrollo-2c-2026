import { armarServices, crearColectivoDePrueba, datosDePerfil, CODIGOS } from "../fixtures.js";
import { NotFoundError } from "../../src/errors/NotFoundError.js";

// Requerimientos adicionales 16, 17 y 30. Estos tests prueban el service con
// el repositorio en memoria; los pipelines de Mongo se prueban contra la base
// (ver "Estadisticas" en el README).
describe("EstadisticaService", () => {
  let services;
  let colectivo;
  let api;
  let front;

  beforeEach(async () => {
    services = await armarServices();
    colectivo = await crearColectivoDePrueba(services.colectivoService);
    const crearProyecto = (titulo, requeridas) =>
      services.proyectoService.crear({
        colectivoId: colectivo.id,
        titulo,
        descripcion: "...",
        perfiles: [datosDePerfil({ requeridas })],
      });
    api = await crearProyecto("API", [CODIGOS.node]);
    front = await crearProyecto("Front", [CODIGOS.node, CODIGOS.react]);

    const ada = await services.colaboradorService.crear({
      cuentaGit: "ada",
      codigosHabilidades: [CODIGOS.node, CODIGOS.react],
    });
    await services.colaboracionService.registrar({ proyectoId: api.id, colaboradorId: ada.id });
    await services.colaboracionService.registrar({
      proyectoId: front.id,
      colaboradorId: ada.id,
      esPublica: false,
    });
    await services.proyectoService.finalizar(front.id);
    await services.proyectoService.verDetalle(api.id);
    await services.proyectoService.verDetalle(api.id);
  });

  test("globales: cuenta colectivos, proyectos, personas y colaboraciones", async () => {
    const otro = await crearColectivoDePrueba(services.colectivoService);
    await services.colectivoService.darDeBaja(otro.id);

    const estadisticas = await services.estadisticaService.globales();

    expect(estadisticas.colectivos).toEqual({ total: 2, activos: 1, dadosDeBaja: 1 });
    expect(estadisticas.proyectos).toEqual({ total: 2, abiertos: 1, finalizados: 1 });
    expect(estadisticas.colaboradores).toEqual({ total: 1 });
    expect(estadisticas.colaboraciones).toMatchObject({
      total: 2,
      aceptadas: 1,
      finalizadas: 1,
      anonimas: 1,
    });
    expect(estadisticas.habilidadesMasRequeridas[0]).toEqual({
      codigo: CODIGOS.node,
      cantidad: 2,
    });
  });

  test("por colectivo: el panel de la organizacion", async () => {
    const panel = await services.estadisticaService.deColectivo(colectivo.id);

    expect(panel.proyectos).toEqual({ total: 2, abiertos: 1, finalizados: 1 });
    expect(panel.visualizaciones).toBe(2);
    expect(panel.colaboraciones).toMatchObject({ total: 2, aceptadas: 1, finalizadas: 1 });
    expect(panel.porProyecto.map((p) => p.titulo)).toEqual(["API", "Front"]);
    expect(panel.porProyecto[0].visualizaciones).toBe(2);
  });

  test("un colectivo sin proyectos da todo en cero", async () => {
    const vacio = await crearColectivoDePrueba(services.colectivoService);
    const panel = await services.estadisticaService.deColectivo(vacio.id);
    expect(panel.proyectos.total).toBe(0);
    expect(panel.avancePromedio).toBe(0);
    expect(panel.porProyecto).toEqual([]);
  });

  test("un colectivo que no existe tira NotFoundError", async () => {
    await expect(services.estadisticaService.deColectivo("no-existe")).rejects.toThrow(
      NotFoundError,
    );
  });
});
