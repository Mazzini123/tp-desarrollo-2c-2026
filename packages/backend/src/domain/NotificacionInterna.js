// Un mensaje dentro de la plataforma para una persona colaboradora.
// Por ahora el destinatario es siempre un colaborador; cuando exista Usuario
// (tercera entrega, autenticacion) pasa a apuntar a el.
//
// Los datos y sus valores por defecto estan en models/NotificacionModel.js,
// que carga esta clase con loadClass.
export class NotificacionInterna {
  marcarComoLeida() {
    this.esLeida = true;
  }

  // String() en los dos lados: el id puede llegar como texto (de la URL) o
  // como ObjectId (guardado en la base), y un === entre los dos da false.
  esPara(colaboradorId) {
    return String(this.destinatarioId) === String(colaboradorId);
  }
}
