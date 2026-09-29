import { randomUUID } from "node:crypto";

export class Colectivo {
  constructor({
    id = randomUUID(),
    nombre,
    descripcion,
    tipoColectivo,
    ubicacion = null,
    fechaAlta = new Date(),
    fechaBaja = null,
  }) {
    this.id = id;
    this.nombre = nombre;
    this.descripcion = descripcion;
    this.tipoColectivo = tipoColectivo;
    this.ubicacion = ubicacion;
    this.proyectos = [];
    this.redesSociales = [];
    this.etiquetas = [];
    // Datos de contacto publicos de la organizacion (a diferencia de los de
    // las personas colaboradoras, que no se muestran).
    this.mediosDeContacto = [];
    this.fechaAlta = fechaAlta;
    this.fechaBaja = fechaBaja;
  }

  estaDadoDeBaja() {
    return this.fechaBaja !== null;
  }

  // Requerimiento adicional 23: "La informacion historica del colectivo no se
  // elimina, pero ya se eliminan de la plataforma todos sus datos de
  // contacto".
  darDeBaja(fecha) {
    this.fechaBaja = fecha;
    this.mediosDeContacto = [];
    this.redesSociales = [];
  }

  agregarProyecto(proyecto) {
    this.proyectos.push(proyecto);
  }
}
