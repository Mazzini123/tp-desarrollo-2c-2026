import { TIPO_UBICACION } from "./enums/TipoUbicacion.js";

export const PROVINCIAS = Object.freeze([
  "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Cordoba", "Corrientes",
  "Entre Rios", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza",
  "Misiones", "Neuquen", "Rio Negro", "Salta", "San Juan", "San Luis",
  "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego",
  "Tucuman",
]);

export class Ubicacion {
  constructor({ tipoUbicacion, nombre = null }) {
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
