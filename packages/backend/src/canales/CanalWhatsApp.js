export class CanalWhatsApp {
  // plantilla: ContentSid (HX...) de una plantilla de Twilio. Las cuentas Trial no
  // aceptan texto propio en WhatsApp: con plantilla se envía esa en lugar del contenido.
  constructor({ cliente, remitente, plantilla = null }) {
    this.cliente = cliente;
    this.remitente = remitente;
    this.plantilla = plantilla;
  }

  async enviar({ destino, contenido }) {
    // Aseguramos que el destino tenga el prefijo 'whatsapp:' requerido por Twilio
    const destinoFormateado = destino.startsWith("whatsapp:")
      ? destino
      : `whatsapp:${destino}`;

    await this.cliente.messages.create({
      ...(this.plantilla ? { contentSid: this.plantilla } : { body: contenido }),
      from: this.remitente,
      to: destinoFormateado,
    });
  }
}
