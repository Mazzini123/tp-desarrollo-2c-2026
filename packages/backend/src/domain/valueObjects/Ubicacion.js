import { DomainError } from "../DomainError.js";
import { NivelUbicacion, esNivelUbicacionValido } from "../enums/NivelUbicacion.js";

const PROVINCIAS = Object.freeze([
  "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Cordoba", "Corrientes",
  "Entre Rios", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza",
  "Misiones", "Neuquen", "Rio Negro", "Salta", "San Juan", "San Luis",
  "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego",
  "Tucuman",
]);

/**
 * Value Object. Representa la ubicación (opcional) de un Colectivo.
 *
 * "detalle" sólo aplica si nivel = PROVINCIA (nombre de una de las 23
 * provincias) o nivel = LOCALIDAD (texto libre). Si nivel es ARGENTINA
 * o CABA, no se usa.
 */
export class Ubicacion {
  #nivel;
  #detalle;

  constructor({ nivel, detalle = null }) {
    if (!esNivelUbicacionValido(nivel)) {
      throw new DomainError(`Nivel de ubicación inválido: ${nivel}`);
    }

    if (nivel === NivelUbicacion.PROVINCIA) {
      if (!detalle || !PROVINCIAS.includes(detalle)) {
        throw new DomainError(
          `Para nivel PROVINCIA, detalle debe ser una de las 23 provincias argentinas. Recibido: ${detalle}`,
        );
      }
    }

    if (nivel === NivelUbicacion.LOCALIDAD) {
      if (!detalle || detalle.trim().length === 0) {
        throw new DomainError("Para nivel LOCALIDAD, detalle es obligatorio");
      }
    }

    this.#nivel = nivel;
    this.#detalle =
      nivel === NivelUbicacion.PROVINCIA || nivel === NivelUbicacion.LOCALIDAD
        ? detalle
        : null;
  }

  get nivel() {
    return this.#nivel;
  }

  get detalle() {
    return this.#detalle;
  }

  esDeAlcanceNacional() {
    return this.#nivel === NivelUbicacion.ARGENTINA;
  }

  toJSON() {
    return { nivel: this.#nivel, detalle: this.#detalle };
  }
}

export { PROVINCIAS };
