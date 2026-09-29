// Requerimiento adicional 39: al finalizar una colaboracion, el colectivo y
// la colaboradora pueden calificarse mutuamente. Objeto de valor.
export class Valoracion {
  constructor({ puntaje, comentario = null, fecha = new Date() }) {
    this.puntaje = puntaje;
    this.comentario = comentario;
    this.fecha = fecha;
  }
}
