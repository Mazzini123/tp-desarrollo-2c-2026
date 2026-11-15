export class CanalSMS {
  // plantilla: nombre de una plantilla predefinida de Twilio. Las cuentas Trial
  // rechazan textos propios, así que con plantilla se envía esa en lugar del contenido.
  constructor({ cliente, remitente, plantilla = null }) {
    this.cliente = cliente;
    this.remitente = remitente;
    this.plantilla = plantilla;
  }

  async enviar({ destino, contenido }) {
    if (!/^\+[1-9]\d{7,14}$/.test(destino)) {
      throw new Error(
        "El destino SMS debe tener formato internacional (+ y 8 a 15 digitos)",
      );
    }
    await this.cliente.messages.create({
      to: destino,
      from: this.remitente,
      body: this.plantilla ?? contenido,
    });
  }
}
