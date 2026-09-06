export function normalizarASnakeCase(titulo) {
  return titulo
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // saca acentos
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export class Habilidad {
  constructor({
    titulo,
    descripcion = "",
    fechaCreacion = new Date(),
    usuario = "admin",
    activo = true,
  }) {
    this.titulo = titulo;
    this.codigo = normalizarASnakeCase(titulo);
    this.descripcion = descripcion;
    this.fechaCreacion = fechaCreacion;
    this.usuario = usuario;
    this.activo = activo;
  }

  desactivar() {
    this.activo = false;
  }

  activar() {
    this.activo = true;
  }

  equals(otra) {
    return otra instanceof Habilidad && otra.codigo === this.codigo;
  }
}
