const EQUIVALENCIAS = {
  a: "aáàäâãå",
  e: "eéèëê",
  i: "iíìïî",
  o: "oóòöôõ",
  u: "uúùüû",
  n: "nñ",
  c: "cç",
};

const ESPECIALES = /[.*+?^${}()|[\]\\\-/]/g;

function sinTildes(texto) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function patronDeCaracter(caracter) {
  const equivalentes = EQUIVALENCIAS[caracter];
  return equivalentes
    ? `[${equivalentes}${equivalentes.toUpperCase()}]`
    : caracter.replace(ESPECIALES, "\\$&");
}

export function patronDeNombre(texto) {
  return [...sinTildes(texto.trim()).toLowerCase()].map(patronDeCaracter).join("");
}
