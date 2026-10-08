// Requerimiento adicional 34: etiquetas en proyectos y organizaciones para
// optimizar las busquedas.
//
// Se normalizan para que "Educación Popular", "educacion popular" y
// " EDUCACION   POPULAR " sean la misma etiqueta: "educacion-popular".
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
