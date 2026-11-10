import mongoose from "mongoose";

// Base vacia antes de cada test, con los indices recreados: algunos son
// reglas (el unique del codigo de habilidad, un lider por colectivo).
export async function vaciarBase() {
  await mongoose.connection.dropDatabase();
  await Promise.all(
    Object.values(mongoose.models).map((modelo) => modelo.createIndexes()),
  );
}
