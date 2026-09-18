export class NotificacionInterna {
    constructor({ usuario, contenido, fecha = new Date(), esLeida = false }) {
        this.usuario = usuario;
        this.contenido = contenido;
        this.fecha = fecha;
        this.esLeida = esLeida;
    }
}