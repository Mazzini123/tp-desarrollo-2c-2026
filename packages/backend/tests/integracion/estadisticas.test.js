import { crearColectivoDePrueba, datosDePerfil, CODIGOS } from "../fixtures.js";
import { armarServicesConMongo, usarBaseDeTest } from "./baseDeTest.js";

/**
 * Las estadisticas (req. adicionales 16, 17 y 30) las calcula Mongo con el
 * Aggregation Framework, sobre las colecciones de colectivos, proyectos,
 * colaboraciones y colaboradoras.
 */
usarBaseDeTest();

async function escenario(s) {
  const colectivo = await crearColectivoDePrueba(s.colectivoService);
  const crearProyecto = (titulo, requeridas) =>
    s.proyectoService.crear({
      colectivoId: colectivo.id,
      titulo,
      descripcion: "...",
      perfiles: [datosDePerfil({ requeridas })],
    });
  const api = await crearProyecto("API", [CODIGOS.node]);
  const front = await crearProyecto("Front", [CODIGOS.node, CODIGOS.react]);

  const ada = await s.colaboradorService.crear({
    cuentaGit: "ada",
    codigosHabilidades: [CODIGOS.node, CODIGOS.react],
  });
  await s.colaboradorService.crear({
    cuentaGit: "grace",
    codigosHabilidades: [CODIGOS.react],
  });
  await s.colaboracionService.registrar({
    proyectoId: api.id,
    perfilId: api.perfiles[0].id,
    colaboradorId: ada.id,
  });
  await s.colaboracionService.registrar({
    proyectoId: front.id,
    perfilId: front.perfiles[0].id,
    colaboradorId: ada.id,
    esPublica: false,
  });
  await s.avanceService.registrarAvanceParaProyecto(api.id, {
    porcentajeConcrecion: 50,
    urlSistema: "https://api.org",
    urlRepositorio: "https://github.com/x/api",
  });
  await s.logroService.crearParaProyecto(api.id, { titulo: "Hito", descripcion: "..." });
  await s.proyectoService.finalizar(front.id);
  await s.proyectoService.verDetalle(api.id);
  await s.proyectoService.verDetalle(api.id);

  const otro = await crearColectivoDePrueba(s.colectivoService);
  await s.colectivoService.darDeBaja(otro.id);

  return colectivo;
}

test("globales y por colectivo, calculadas por la base", async () => {
  const s = await armarServicesConMongo();
  const colectivo = await escenario(s);

  const { generadoEn: _g, ...globales } = await s.estadisticaService.globales();
  expect(globales).toEqual({
    colectivos: { total: 2, activos: 1, dadosDeBaja: 1 },
    proyectos: { total: 2, abiertos: 1, finalizados: 1 },
    colaboradores: { total: 2 },
    // TODO_SUMA acepta en el momento; la de Front termino con el proyecto.
    colaboraciones: {
      total: 2,
      pendientes: 0,
      aceptadas: 1,
      rechazadas: 0,
      finalizadas: 1,
      anonimas: 1,
    },
    habilidadesMasRequeridas: [
      { codigo: CODIGOS.node, cantidad: 2 },
      { codigo: CODIGOS.react, cantidad: 1 },
    ],
    habilidadesMasOfrecidas: [
      { codigo: CODIGOS.react, cantidad: 2 },
      { codigo: CODIGOS.node, cantidad: 1 },
    ],
  });

  const { generadoEn: _d, ...delColectivo } = await s.estadisticaService.deColectivo(
    colectivo.id,
  );
  expect(delColectivo).toEqual({
    colectivo: { id: colectivo.id, nombre: colectivo.nombre },
    proyectos: { total: 2, abiertos: 1, finalizados: 1 },
    colaboraciones: {
      total: 2,
      pendientes: 0,
      aceptadas: 1,
      rechazadas: 0,
      finalizadas: 1,
    },
    visualizaciones: 2,
    avancePromedio: 25, // (50 + 0) / 2
    logros: 1,
    porProyecto: [
      {
        id: expect.anything(),
        titulo: "API",
        estado: "ABIERTO",
        visualizaciones: 2,
        porcentajeConcrecion: 50,
        logros: 1,
        colaboraciones: 1,
      },
      {
        id: expect.anything(),
        titulo: "Front",
        estado: "FINALIZADO",
        visualizaciones: 0,
        porcentajeConcrecion: 0,
        logros: 0,
        colaboraciones: 1,
      },
    ],
  });
});
