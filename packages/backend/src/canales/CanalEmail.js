// Adaptador de salida: manda un email real a traves de un transporte de
// nodemailer (SMTP). Vive afuera de los services por la misma razon que los
// repositorios: el service no sabe COMO se envia, solo pide que se envie.
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
