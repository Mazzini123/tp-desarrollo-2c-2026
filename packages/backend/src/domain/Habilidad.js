import { DomainError } from "../errors/index.js";

export function normalizarASnakeCase(titulo) {
  return titulo
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // saca acentos
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Catálogo global de habilidades, precargado por el equipo
 * administrativo. Los proyectos y los colaboradores sólo pueden
 * referenciar habilidades de este catálogo, nunca inventar una.
 *
 * El código, por ahora, es el título normalizado en snake_case.
 * fechaCreacion, usuario y activo son datos de auditoría: "activo"
 * permite dar de baja una habilidad sin borrarla, de modo que los
 * proyectos que ya la referencian sigan siendo válidos.
 */
export class Habilidad {
  constructor({
    titulo,
    codigo,
    descripcion = "",
    fechaCreacion = new Date(),
    usuario = "admin",
    activo = true,
  }) {
    if (!titulo || titulo.trim().length === 0) {
      throw new DomainError("El título de la habilidad es obligatorio");
    }
    if (!codigo || codigo.trim().length === 0) {
      throw new DomainError("El código de la habilidad es obligatorio");
    }

    this.titulo = titulo.trim();
    this.codigo = codigo;
    this.descripcion = descripcion;
    this.fechaCreacion = fechaCreacion;
    this.usuario = usuario;
    this.activo = activo;
  }

  /** Alta de una habilidad nueva: calcula el código desde el título. */
  static crear({ titulo, descripcion, usuario }) {
    return new Habilidad({
      titulo,
      codigo: normalizarASnakeCase(titulo),
      descripcion,
      usuario,
    });
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
