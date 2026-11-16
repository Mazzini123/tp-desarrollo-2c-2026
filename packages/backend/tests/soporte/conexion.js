import mongoose from "mongoose";

function uriDeTest() {
  const base = process.env.MONGO_URI_TEST;
  const nombre = `cav-test-${process.env.JEST_WORKER_ID ?? "1"}`;
  if (base.includes("__BASE__")) return base.replace("__BASE__", nombre);
  const url = new URL(base);
  url.pathname = `/${nombre}`;
  return url.toString();
}

beforeAll(async () => {
  await mongoose.connect(uriDeTest(), { serverSelectionTimeoutMS: 5000 });
  if (!mongoose.connection.name.startsWith("cav-test-")) {
    throw new Error(`La base "${mongoose.connection.name}" no es de test`);
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
