import mongoose from "mongoose";
import {
  componerApp,
  crearRepositoriosMongo,
  crearCanalesEnMemoria,
} from "../../src/composicion.js";
import { cargarHabilidadesIniciales } from "../../src/seed/habilidadesSeed.js";

/**
 * Tests de integracion: los mismos services, pero contra un Mongo de verdad.
 *
 * Usan OTRA base del mismo motor. El nombre de la base va en el string de
 * conexion, asi que dropearla no toca la de desarrollo:
 *
 *   mongodb://127.0.0.1:27017/codigo-a-voluntad        <- desarrollo
 *   mongodb://127.0.0.1:27017/codigo-a-voluntad-test   <- tests (se dropea siempre)
 *
 * Para correrlos: `docker compose up -d mongo` y despues
 * `npm run test:integracion` desde la raiz.
 */
export const URI_DE_TEST =
  process.env.MONGO_URI_TEST ?? "mongodb://127.0.0.1:27017/codigo-a-voluntad-test";

// Se llama una vez por archivo de test: conecta antes de todos y desconecta
// al final.
export function usarBaseDeTest() {
  beforeAll(async () => {
    try {
      await mongoose.connect(URI_DE_TEST, { serverSelectionTimeoutMS: 3000 });
    } catch (error) {
      throw new Error(
        `No hay un Mongo en ${URI_DE_TEST}. Levantalo con "docker compose up -d mongo". ` +
          `(${error.message})`,
      );
    }

    // Red de seguridad: estos tests borran la base entera.
    if (!mongoose.connection.name.endsWith("-test")) {
      const nombre = mongoose.connection.name;
      await mongoose.disconnect();
      throw new Error(
        `La base "${nombre}" no es de test (tiene que terminar en "-test")`,
      );
    }

    // Mongoose crea los indices solo al conectar. Se espera a que termine
    // antes del primer drop, para que las dos cosas no se crucen.
    await Promise.all(Object.values(mongoose.models).map((modelo) => modelo.init()));
  });

  afterAll(() => mongoose.disconnect());
}

/**
 * Antes de cada test: base vacia, indices recreados, catalogo de habilidades
 * sembrado y un juego nuevo de services sobre los repositorios de Mongo (los
 * mismos que usa la app levantada).
 */
export async function armarServicesConMongo() {
  await mongoose.connection.dropDatabase();
  // dropDatabase tambien borra los indices, y algunos son reglas (el unique
  // del codigo de habilidad): se vuelven a crear.
  await Promise.all(
    Object.values(mongoose.models).map((modelo) => modelo.createIndexes()),
  );

  const canales = crearCanalesEnMemoria();
  const { controllers, services } = componerApp({
    repositorios: crearRepositoriosMongo(),
    canales,
  });
  await cargarHabilidadesIniciales(services.habilidadService);

  return { ...services, canales, controllers };
}
