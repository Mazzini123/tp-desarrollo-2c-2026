import mongoose from "mongoose";
import { ContextoUsuarioModel, VALIDADOR_DE_CONTEXTOS } from "./ContextoUsuarioModel.js";

const YA_EXISTE = 48;

export async function asegurarValidadores(db = mongoose.connection.db) {
  const nombre = ContextoUsuarioModel.collection.collectionName;
  const opciones = {
    validator: VALIDADOR_DE_CONTEXTOS,
    validationLevel: "strict",
    validationAction: "error",
  };

  try {
    await db.createCollection(nombre, opciones);
  } catch (error) {
    if (error.code !== YA_EXISTE) throw error;
    await db.command({ collMod: nombre, ...opciones });
  }
}
