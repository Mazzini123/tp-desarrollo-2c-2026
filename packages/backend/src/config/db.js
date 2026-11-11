import mongoose from "mongoose";
import "./transacciones.js";
import { registro } from "./registro.js";

export async function conectarBaseDeDatos() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("Falta la variable de entorno MONGO_URI");
  }

  await mongoose.connect(uri, { autoCreate: false, autoIndex: false });
  const topologia = await mongoose.connection.db.command({ hello: 1 });
  if (!topologia.setName && topologia.msg !== "isdbgrid") {
    throw new Error(
      "La API requiere MongoDB con soporte de transacciones (replica set o mongos)",
    );
  }

  registro.info("base_conectada", { base: mongoose.connection.name });
}

export async function asegurarIndices() {
  for (const modelo of Object.values(mongoose.models)) {
    await modelo.createIndexes();
  }
}
