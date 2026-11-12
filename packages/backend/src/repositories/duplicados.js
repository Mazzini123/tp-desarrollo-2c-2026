import { DuplicadoError } from "../errors/DuplicadoError.js";

export function errorDeDuplicado(mensaje) {
  return new DuplicadoError(mensaje);
}

export const esDuplicado = (error) =>
  error instanceof DuplicadoError || error?.code === 11000;
