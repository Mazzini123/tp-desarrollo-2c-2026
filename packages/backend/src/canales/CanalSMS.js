export class CanalSMS {
  constructor({ cliente, remitente }) {
    this.cliente = cliente;
    this.remitente = remitente;
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
      body: contenido,
    });
  }
}
