export function normalizarEtiqueta(texto) {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // saca acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizarEtiquetas(lista = []) {
  return [...new Set(lista.map(normalizarEtiqueta).filter(Boolean))];
}
