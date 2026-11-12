export function normalizarASnakeCase(titulo) {
  return titulo
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export class Habilidad {
  equals(otra) {
    return Boolean(otra) && otra.codigo === this.codigo;
  }
}
