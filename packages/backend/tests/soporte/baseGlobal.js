import { MongoMemoryReplSet } from "mongodb-memory-server-core";

// Una sola instancia de MongoDB para toda la corrida: un replica set de un
// nodo (como en docker-compose), porque la API usa transacciones. Cada
// worker de Jest usa su propia base dentro de esta instancia.
//
// Con MONGO_URI_TEST se usa un Mongo ya levantado (por ejemplo el de
// docker-compose) en lugar de descargar y arrancar uno.
export default async function iniciar() {
  if (process.env.MONGO_URI_TEST) return;
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  globalThis.__REPLSET__ = replSet;
  process.env.MONGO_URI_TEST = replSet.getUri("__BASE__");
}
