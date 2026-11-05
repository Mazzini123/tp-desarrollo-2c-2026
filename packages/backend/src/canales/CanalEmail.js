export class CanalEmail {
  constructor({ transporte, remitente }) {
    this.transporte = transporte;
    this.remitente = remitente;
  }

  async enviar({ destino, asunto, contenido }) {
    await this.transporte.sendMail({
      from: this.remitente,
      to: destino,
      subject: asunto,
      text: contenido,
    });
  }
}
