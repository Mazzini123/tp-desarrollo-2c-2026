export class CanalEmail {
  constructor({ transporte, remitente }) {
    this.transporte = transporte;
    this.remitente = remitente;
  }

  async enviar({ destino, asunto, contenido }) {
    const resultado = await this.transporte.sendMail({
      from: this.remitente,
      to: destino,
      subject: asunto,
      text: contenido,
    });
    if (!resultado.accepted?.length || resultado.rejected?.length) {
      throw new Error("El servidor SMTP no acepto al destinatario");
    }
  }
}
