export function normalizarASnakeCase(titulo) {
  return titulo
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // saca acentos
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export class Habilidad {
  desactivar() {
    this.activo = false;
  }

  activar() {
    this.activo = true;
  }

  equals(otra) {
    return Boolean(otra) && otra.codigo === this.codigo;
  }
}
