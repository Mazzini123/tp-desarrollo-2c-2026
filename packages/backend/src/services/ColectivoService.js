import { Colectivo } from "../domain/Colectivo.js";
import { Ubicacion } from "../domain/Ubicacion.js";
import { NotFoundError } from "../errors/NotFoundError.js";

function construirUbicacion(datos) {
  if (!datos) return null;
  return new Ubicacion(datos);
}

export class ColectivoService {
  #colectivoRepository;

  constructor({ colectivoRepository }) {
    this.#colectivoRepository = colectivoRepository;
  }

  crear({ nombre, descripcion, tipoColectivo, ubicacion }) {
    const colectivo = new Colectivo({
      nombre,
      descripcion,
      tipoColectivo,
      ubicacion: construirUbicacion(ubicacion),
    });

    return this.#colectivoRepository.guardar(colectivo);
  }

  listar() {
    return this.#colectivoRepository.listar();
  }

  buscarPorId(id) {
    const colectivo = this.#colectivoRepository.buscarPorId(id);
    if (!colectivo) {
      throw new NotFoundError(`No existe un colectivo con id "${id}"`);
    }
    return colectivo;
  }

  actualizar(id, { nombre, descripcion, ubicacion }) {
    const colectivo = this.buscarPorId(id);

    colectivo.actualizarDatos({
      nombre,
      descripcion,
      ubicacion: ubicacion === undefined ? undefined : construirUbicacion(ubicacion),
    });

    return this.#colectivoRepository.guardar(colectivo);
  }
}
