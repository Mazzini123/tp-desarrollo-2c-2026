import { ColectivoModel } from "../../src/models/ColectivoModel.js";
import { MongoColectivoRepository } from "../../src/repositories/MongoColectivoRepository.js";
import {
  componerApp,
  crearRepositoriosEnMemoria,
  crearCanalesEnMemoria,
} from "../../src/composicion.js";
import { cargarHabilidadesIniciales } from "../../src/seed/habilidadesSeed.js";
import { crearProyectoDePrueba } from "../fixtures.js";

/**
 * Ida y vuelta dominio -> documento -> dominio del repositorio de Mongo.
 *
 * Los tests de services usan el repositorio en memoria, que guarda los objetos
 * tal cual: ahi nunca se pierde nada. El de Mongo, en cambio, traduce a un
 * documento y Mongoose DESCARTA todo campo que no este en el schema. Si alguien
 * agrega un atributo al dominio y se olvida del schema o de la traduccion, los
 * tests de services siguen en verde y en produccion el dato desaparece.
 *
 * Para probarlo sin levantar una base, los metodos del modelo que usa el
 * repositorio se reemplazan por un Map. Lo importante es que cada documento
 * pasa por `new ColectivoModel(doc)`, o sea por el schema, como en Mongo.
 */

const originales = {};
let base;

function consulta(resultado) {
  const q = {
    sort: () => q,
    skip: () => q,
    limit: () => q,
    lean: async () => resultado(),
  };
  return q;
}

// Lo que Mongo guardaria: el documento filtrado por el schema, sin los
// metodos de Mongoose (como lo devuelve .lean()).
function comoLoGuardaMongo(documento) {
  return structuredClone(new ColectivoModel(documento).toObject());
}

beforeAll(() => {
  for (const metodo of ["updateOne", "findById", "findOne", "find"]) {
    originales[metodo] = ColectivoModel[metodo];
  }
  ColectivoModel.updateOne = async (filtro, cambios) => {
    base.set(filtro._id, comoLoGuardaMongo(cambios.$set));
  };
  ColectivoModel.findById = (id) => consulta(() => base.get(id) ?? null);
  ColectivoModel.findOne = (filtro) =>
    consulta(
      () =>
        [...base.values()].find((c) =>
          c.proyectos.some((p) => p._id === filtro["proyectos._id"]),
        ) ?? null,
    );
  ColectivoModel.find = () => consulta(() => [...base.values()]);
});

afterAll(() => Object.assign(ColectivoModel, originales));

async function armarServicesConRepositorioMongo() {
  base = new Map();
  const repositorios = crearRepositoriosEnMemoria();
  repositorios.colectivoRepository = new MongoColectivoRepository({
    habilidadRepository: repositorios.habilidadRepository,
    colaboradorRepository: repositorios.colaboradorRepository,
  });
  const { services } = componerApp({ repositorios, canales: crearCanalesEnMemoria() });
  await cargarHabilidadesIniciales(services.habilidadService);
  return services;
}

describe("MongoColectivoRepository · logros", () => {
  test("el id del logro se conserva al guardar y volver a leer", async () => {
    const services = await armarServicesConRepositorioMongo();
    const { proyecto } = await crearProyectoDePrueba(services);

    const logro = await services.logroService.crearParaProyecto(proyecto.id, {
      titulo: "Primer deploy",
      descripcion: "La app quedo publicada",
    });

    const leidos = await services.logroService.conseguirTodosDeProyecto(proyecto.id);
    expect(leidos.map((l) => l.id)).toEqual([logro.id]);

    const encontrado = await services.logroService.conseguirPorIdParaProyecto(
      proyecto.id,
      logro.id,
    );
    expect(encontrado.titulo).toBe("Primer deploy");
  });

  test("se puede actualizar y borrar un logro por su id", async () => {
    const services = await armarServicesConRepositorioMongo();
    const { proyecto } = await crearProyectoDePrueba(services);
    const logro = await services.logroService.crearParaProyecto(proyecto.id, {
      titulo: "Hito",
      descripcion: "v1",
    });

    await services.logroService.actualizarParaProyecto(proyecto.id, logro.id, {
      titulo: "Hito",
      descripcion: "v2",
    });
    expect(
      (await services.logroService.conseguirPorIdParaProyecto(proyecto.id, logro.id))
        .descripcion,
    ).toBe("v2");

    await services.logroService.eliminarParaProyecto(proyecto.id, logro.id);
    expect(await services.logroService.conseguirTodosDeProyecto(proyecto.id)).toEqual([]);
  });
});

describe("MongoColectivoRepository · avances", () => {
  test("los avances se guardan y se leen con todos sus datos", async () => {
    const services = await armarServicesConRepositorioMongo();
    const { proyecto } = await crearProyectoDePrueba(services);

    const primero = await services.avanceService.registrarAvanceParaProyecto(
      proyecto.id,
      {
        porcentajeConcrecion: 30,
        urlSistema: "https://sistema.example.org",
        urlRepositorio: "https://github.com/ejemplo/repo",
      },
    );
    const segundo = await services.avanceService.registrarAvanceParaProyecto(
      proyecto.id,
      {
        porcentajeConcrecion: 70,
        urlSistema: "https://sistema.example.org",
        urlRepositorio: "https://github.com/ejemplo/repo",
      },
    );

    const avances = await services.avanceService.listarParaProyecto(proyecto.id);
    expect(avances.map((a) => [a.id, a.porcentajeConcrecion])).toEqual([
      [primero.id, 30],
      [segundo.id, 70],
    ]);
    // getTime() falla si la fecha volvio como texto en vez de Date.
    expect(avances[0].fecha.getTime()).toBe(primero.fecha.getTime());
    expect(avances[0].urlRepositorio).toBe("https://github.com/ejemplo/repo");

    const encontrado = await services.avanceService.buscarPorIdParaProyecto(
      proyecto.id,
      primero.id,
    );
    expect(encontrado.porcentajeConcrecion).toBe(30);
  });

  test("el proyecto conserva como valores actuales los del ultimo avance", async () => {
    const services = await armarServicesConRepositorioMongo();
    const { proyecto } = await crearProyectoDePrueba(services);

    await services.avanceService.registrarAvanceParaProyecto(proyecto.id, {
      porcentajeConcrecion: 45,
      urlSistema: "https://nuevo.example.org",
      urlRepositorio: "https://github.com/ejemplo/nuevo",
    });

    const { proyecto: leido } = await services.proyectoService.buscarProyectoConColectivo(
      proyecto.id,
    );
    expect(leido.porcentajeConcrecion).toBe(45);
    expect(leido.urlSistema).toBe("https://nuevo.example.org");
  });
});
