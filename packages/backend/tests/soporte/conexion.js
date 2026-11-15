import mongoose from "mongoose";

// Se conecta una vez por archivo de test, a una base propia del worker: los
// archivos corren en paralelo y no se pisan los datos.
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
  // Red de seguridad: los tests borran la base entera.
  if (!mongoose.connection.name.startsWith("cav-test-")) {
    throw new Error(`La base "${mongoose.connection.name}" no es de test`);
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
