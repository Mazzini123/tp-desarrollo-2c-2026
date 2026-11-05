import mongoose from "mongoose";

const OBJECT_ID = /^[a-f\d]{24}$/i;

export function esIdValido(id) {
  return typeof id === "string" ? OBJECT_ID.test(id) : Boolean(id);
}

export function aObjectId(valor) {
  return new mongoose.Types.ObjectId(String(valor?._id ?? valor));
}
