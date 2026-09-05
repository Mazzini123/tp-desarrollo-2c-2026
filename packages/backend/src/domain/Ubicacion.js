import { DomainError } from "../errors/index.js";
import { TIPO_UBICACION, esTipoUbicacionValido } from "./enums/TipoUbicacion.js";

export const PROVINCIAS = Object.freeze([
  "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Cordoba", "Corrientes",
  "Entre Rios", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza",
  "Misiones", "Neuquen", "Rio Negro", "Salta", "San Juan", "San Luis",
  "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego",
  "Tucuman",
]);

/**
 * Ubicación (opcional) de un Colectivo.
 *
 * "nombre" sólo aplica si tipoUbicacion es PROVINCIA (una de las 23
 * provincias) o LOCALIDAD (texto libre). Si es ARGENTINA o CABA, no
 * se usa.
 */
export class Ubicacion {
  constructor({ tipoUbicacion, nombre = null }) {
    if (!esTipoUbicacionValido(tipoUbicacion)) {
      throw new DomainError(`Tipo de ubicación inválido: ${tipoUbicacion}`);
    }
    if (tipoUbicacion === TIPO_UBICACION.PROVINCIA && !PROVINCIAS.includes(nombre)) {
      throw new DomainError(
        `Para PROVINCIA, nombre debe ser una de las 23 provincias argentinas. Recibido: ${nombre}`,
      );
    }
    if (tipoUbicacion === TIPO_UBICACION.LOCALIDAD && (!nombre || nombre.trim().length === 0)) {
      throw new DomainError("Para LOCALIDAD, nombre es obligatorio");
    }

    this.tipoUbicacion = tipoUbicacion;
    this.nombre =
      tipoUbicacion === TIPO_UBICACION.PROVINCIA || tipoUbicacion === TIPO_UBICACION.LOCALIDAD
        ? nombre
        : null;
  }

  esDeAlcanceNacional() {
    return this.tipoUbicacion === TIPO_UBICACION.ARGENTINA;
  }
}
