import {
  armarServices,
  crearColectivoDePrueba,
  datosDePerfil,
  CODIGOS,
} from "../fixtures.js";
import { armarServicesConMongo, usarBaseDeTest } from "./baseDeTest.js";

/**
 * Las estadisticas (req. adicionales 16, 17 y 30) las calcula Mongo con el
 * Aggregation Framework. El repositorio en memoria calcula lo mismo en
 * JavaScript. Mismo escenario en los dos: los resultados tienen que coincidir.
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

// Lo que cambia entre las dos corridas: la hora y los ids generados.
const sinHora = ({ generadoEn: _, ...resto }) => resto;
const sinIds = ({ colectivo: _, porProyecto, ...resto }) => ({
  ...resto,
  porProyecto: porProyecto.map(({ id: __, ...proyecto }) => proyecto),
});

test("globales y por colectivo: Mongo calcula lo mismo que la version en memoria", async () => {
  const enMemoria = await armarServices();
  const conMongo = await armarServicesConMongo();

  const colectivoEnMemoria = await escenario(enMemoria);
  const colectivoEnMongo = await escenario(conMongo);

  expect(sinHora(await conMongo.estadisticaService.globales())).toEqual(
    sinHora(await enMemoria.estadisticaService.globales()),
  );

  const deMongo = await conMongo.estadisticaService.deColectivo(colectivoEnMongo.id);
  const deMemoria = await enMemoria.estadisticaService.deColectivo(colectivoEnMemoria.id);
  expect(sinIds(sinHora(deMongo))).toEqual(sinIds(sinHora(deMemoria)));

  // Y un par de valores concretos, para no depender solo de la comparacion.
  expect(deMongo.visualizaciones).toBe(2);
  expect(deMongo.avancePromedio).toBe(25); // (50 + 0) / 2
  expect(deMongo.porProyecto.map((p) => p.titulo)).toEqual(["API", "Front"]);
});
