import mongoose from "mongoose";
import { ContextoUsuarioModel, VALIDADOR_DE_CONTEXTOS } from "./ContextoUsuarioModel.js";

const YA_EXISTE = 48;

export async function asegurarValidadores() {
  const db = mongoose.connection.db;
  const nombre = ContextoUsuarioModel.collection.collectionName;
  try {
    await db.createCollection(nombre);
  } catch (error) {
    if (error.code !== YA_EXISTE) throw error;
  }
  try {
    await db.command({
      collMod: nombre,
      validator: VALIDADOR_DE_CONTEXTOS,
      validationLevel: "strict",
      validationAction: "error",
    });
  } catch (error) {
    console.warn(`No se pudo instalar el validador de ${nombre}:`, error.message);
  }
}
