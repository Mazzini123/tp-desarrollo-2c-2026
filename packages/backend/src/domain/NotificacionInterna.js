export class NotificacionInterna {
  marcarComoLeida() {
    this.esLeida = true;
  }

  esPara(colaboradorId) {
    return String(this.destinatarioId) === String(colaboradorId);
  }
}
