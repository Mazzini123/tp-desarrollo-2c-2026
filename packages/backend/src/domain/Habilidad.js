export function normalizarASnakeCase(titulo) {
  return titulo
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // saca acentos
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// Lo que una habilidad SABE HACER. Los datos y como se guardan los declara el
// schema (models/HabilidadModel.js), que carga esta clase con loadClass: un
// documento de Mongoose ES una Habilidad, con estos metodos.
//
// No tiene constructor porque Mongoose no lo llama: los valores por defecto
// estan en el schema.
export class Habilidad {
  desactivar() {
    this.activo = false;
  }

  activar() {
    this.activo = true;
  }

  // Dos habilidades son la misma si tienen el mismo codigo, aunque sean
  // objetos distintos (la del catalogo y la copia guardada en un perfil).
  equals(otra) {
    return Boolean(otra) && otra.codigo === this.codigo;
  }
}
