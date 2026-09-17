export class Logro {
    constructor({ titulo, descripcion, fecha = new Date() }) {
        this.titulo = titulo;
        this.descripcion = descripcion;
        this.fecha = fecha;
    }
}