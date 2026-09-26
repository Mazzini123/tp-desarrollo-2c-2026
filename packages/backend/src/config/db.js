import mongoose from "mongoose";

export async function conectarBaseDeDatos() {
  const uri = process.env.MONGO_URI;

  // Fallar temprano y con un mensaje claro es mejor que un error
  // criptico de conexion veinte lineas mas abajo.
  if (!uri) {
    throw new Error("Falta la variable de entorno MONGO_URI");
  }

  await mongoose.connect(uri);

  console.log(`Conectado a MongoDB (base: ${mongoose.connection.name})`);
}