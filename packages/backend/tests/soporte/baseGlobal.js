import { MongoMemoryReplSet } from "mongodb-memory-server-core";

export default async function iniciar() {
  if (process.env.MONGO_URI_TEST) return;
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  globalThis.__REPLSET__ = replSet;
  process.env.MONGO_URI_TEST = replSet.getUri("__BASE__");
}
