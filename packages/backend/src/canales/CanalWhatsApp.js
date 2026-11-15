export class CanalWhatsApp {
  constructor({ cliente, remitente }) {
    this.cliente = cliente;
    this.remitente = remitente;
  }

  async enviar({ destino, contenido }) {
    // Aseguramos que el destino tenga el prefijo 'whatsapp:' requerido por Twilio
    const destinoFormateado = destino.startsWith("whatsapp:")
      ? destino
      : `whatsapp:${destino}`;

    await this.cliente.messages.create({
      body: contenido,
      from: this.remitente,
      to: destinoFormateado,
    });
  }
}
