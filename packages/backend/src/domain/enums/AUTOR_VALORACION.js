import { esValorDeEnum } from "../../utils/validaciones.js";

// Quien escribe la valoracion. Todavia no hay usuarios que lo prueben (llegan
// con la autenticacion, en la tercera entrega): por ahora se declara.
export const AUTOR_VALORACION = Object.freeze({
  COLECTIVO: "COLECTIVO",
  COLABORADOR: "COLABORADOR",
});

export const esAutorValoracionValido = (valor) => esValorDeEnum(AUTOR_VALORACION, valor);
